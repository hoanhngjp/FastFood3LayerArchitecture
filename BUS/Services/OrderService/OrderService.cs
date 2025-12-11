using BUS.Services.PaymentService;
using Common;
using DAT.Entity;
using DAT.UnitOfWork;
using DTO.DTO;
using DTO.DTO.Order;
using DTO.DTO.Payment;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Net.Sockets;
using System.Text;
using System.Threading.Tasks;
using System.Web;

namespace BUS.Services
{
    public class OrderService : IOrderService
    {
        private readonly IUnitOfWork _unitOfWork;
        private readonly IConfiguration _config;
        private readonly IHttpContextAccessor _httpContextAccessor;
        private readonly IVnPayService _vnPayService;

        public OrderService(IUnitOfWork unitOfWork, IConfiguration config, IHttpContextAccessor httpContextAccessor, IVnPayService vnPayService)
        {
            _unitOfWork = unitOfWork;
            _config = config;
            _httpContextAccessor = httpContextAccessor;
            _vnPayService = vnPayService;
        }
        public async Task<IEnumerable<OrderDTO>> GetAllAsync()
        {
            var orders = await _unitOfWork.Orders.GetAllWithDetailsAsync();
            return orders.Select(MapToDTO);
        }
        public async Task<OrderDTO?> GetByIdAsync(int id)
        {
            var o = await _unitOfWork.Orders.GetByIdWithDetailsAsync(id);
            if (o == null) return null;
            return MapToDTO(o);
        }
        public async Task<OrderCreationResponseDTO> CreateAsync(OrderDTO dto, int userIdFromToken)
        {
            // 1. Kiểm tra Status
            var pendingStatus = (await _unitOfWork.Repository<OrderStatus>()
                                .FindAsync(s => s.StatusName == "Pending"))
                                .FirstOrDefault();

            if (pendingStatus == null)
            {
                throw new InvalidOperationException("LỖI HỆ THỐNG: Không tìm thấy 'Pending' Status. Hãy seed CSDL.");
            }

            // 2. Tính tổng tiền
            int total = 0;
            foreach (var item in dto.Items)
            {
                var food = await _unitOfWork.FoodItems.GetByIdAsync(item.FoodID);

                if (food == null)
                    throw new KeyNotFoundException($"Food item not found: {item.FoodID}");

                item.Price = food.Price;
                total += food.Price * item.Quantity;
            }

            // 3. Tạo Entity Order
            var order = new Order
            {
                UserID = userIdFromToken,
                AdrsID = dto.AdrsID,
                RestaurantID = dto.RestaurantID,
                OrderTime = DateTime.UtcNow,
                StatusID = pendingStatus.StatusID,
                TotalAmount = total,
                OrderItems = dto.Items.Select(i => new OrderItem
                {
                    FoodID = i.FoodID,
                    Quantity = i.Quantity,
                    Price = i.Price
                }).ToList(),
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
            };

            await _unitOfWork.Orders.AddAsync(order);

            // --- [CẬP NHẬT: TĂNG ORDER COUNT CHO USER] ---
            // Lấy thông tin User hiện tại
            var user = await _unitOfWork.Repository<User>().GetByIdAsync(userIdFromToken);
            if (user != null)
            {
                // Tăng số lượng đơn hàng
                user.OrderCount++;

                // Đánh dấu cập nhật
                _unitOfWork.Repository<User>().Update(user);
            }
            // ---------------------------------------------

            // 4. Lưu tất cả thay đổi (Order + User Update) cùng lúc
            await _unitOfWork.SaveChangesAsync();

            // 5. Tạo URL thanh toán VNPay
            var paymentModel = new PaymentInformationModel
            {
                OrderId = order.OrderID,
                Amount = order.TotalAmount,
                Name = "Khach hang",
                OrderDescription = $"Thanh toan don hang {order.OrderID}",
                OrderType = "other"
            };

            string paymentUrl = _vnPayService.CreatePaymentUrl(paymentModel, _httpContextAccessor.HttpContext);

            return new OrderCreationResponseDTO
            {
                OrderID = order.OrderID,
                PaymentUrl = paymentUrl
            };
        }
        public async Task<UpdateStatusResult> UpdateStatusAsync(int orderId, string status)
        {
            var statusEntity = (await _unitOfWork.Repository<OrderStatus>()
                                    .FindAsync(s => s.StatusName == status))
                                    .FirstOrDefault();
            if (statusEntity == null)
                return UpdateStatusResult.StatusNotFound;

            var order = await _unitOfWork.Orders.GetByIdAsync(orderId);
            if (order == null)
                return UpdateStatusResult.OrderNotFound;

            order.StatusID = statusEntity.StatusID;
            order.UpdatedAt = DateTime.UtcNow;

            _unitOfWork.Orders.Update(order);
            await _unitOfWork.SaveChangesAsync();

            return UpdateStatusResult.Success;
        }
        public async Task<bool> DeleteAsync(int id)
        {
            var order = await _unitOfWork.Orders.GetByIdAsync(id);
            if (order == null) return false;

            _unitOfWork.Orders.Remove(order);
            await _unitOfWork.SaveChangesAsync();
            return true;
        }
        public async Task<IEnumerable<OrderDTO>> GetMyOrdersAsync(int userId)
        {
            var orders = await _unitOfWork.Orders.GetByUserIdWithDetailsAsync(userId);

            return orders.Select(MapToDTO);
        }
        private async Task<bool> CheckRestaurantOwnershipAsync(int managerUserId, int restaurantId)
        {
            var restaurant = await _unitOfWork.Restaurants.GetByIdAsync(restaurantId);

            if (restaurant == null)
                return false;

            return restaurant.ManagerID == managerUserId;
        }
        private async Task<(Order? order, UpdateStatusResult result)> CheckOrderOwnershipAsync(int orderId, int managerUserId)
        {
            var order = await _unitOfWork.Orders.GetByIdWithDetailsAsync(orderId);

            if (order == null)
                return (null, UpdateStatusResult.OrderNotFound);

            if (order.Restaurant == null)
                throw new InvalidOperationException($"Lỗi Include: GetByIdWithDetailsAsync({orderId}) phải 'Include' Restaurant.");

            if (order.Restaurant.ManagerID != managerUserId)
                return (null, UpdateStatusResult.PermissionDenied);

            return (order, UpdateStatusResult.Success);
        }
        public async Task<IEnumerable<OrderDTO>> GetOrdersForRestaurantAsync(int restaurantId, string statusFilter, int managerUserId)
        {
            if (!await CheckRestaurantOwnershipAsync(managerUserId, restaurantId))
            {
                return Enumerable.Empty<OrderDTO>();
            }

            var allOrdersWithDetails = await _unitOfWork.Orders.GetAllWithDetailsAsync();

            var filteredOrders = allOrdersWithDetails
                .Where(o => o.RestaurantID == restaurantId &&
                            // LOGIC MỚI Ở ĐÂY:
                            (string.IsNullOrEmpty(statusFilter) || statusFilter == "All" ||
                            (o.OrderStatus != null && o.OrderStatus.StatusName == statusFilter)))
                .OrderByDescending(o => o.OrderTime);

            return filteredOrders.Select(MapToDTO);
        }
        public async Task<UpdateStatusResult> ConfirmOrderAsync(int orderId, int managerUserId)
        {
            var (order, result) = await CheckOrderOwnershipAsync(orderId, managerUserId);
            if (result != UpdateStatusResult.Success)
                return result;

            if (order.OrderStatus.StatusName != "Pending")
                return UpdateStatusResult.AlreadyProcessed;

            var successStatus = (await _unitOfWork.Repository<PaymentTransactionStatus>().FindAsync(s => s.StatusName == "Success")).FirstOrDefault();
            if (successStatus == null) throw new InvalidOperationException("Lỗi CSDL: Seed 'Success' status.");

            var payment = (await _unitOfWork.Repository<PaymentTransaction>().FindAsync(
                            p => p.OrderID == orderId && p.StatusID == successStatus.StatusID
                           )).FirstOrDefault();

            if (payment == null)
                return UpdateStatusResult.NotPaid;

            return await UpdateStatusAsync(orderId, "Confirmed");
        }
        public async Task<UpdateStatusResult> CancelOrderAsync(int orderId, int managerUserId)
        {
            var (order, result) = await CheckOrderOwnershipAsync(orderId, managerUserId);
            if (result != UpdateStatusResult.Success)
                return result;

            var statusName = order.OrderStatus.StatusName;
            if (statusName == "Cancelled" || statusName == "Delivered")
                return UpdateStatusResult.AlreadyProcessed;

            return await UpdateStatusAsync(orderId, "Cancelled");
        }

        public async Task<OrderTrackingDTO?> GetOrderTrackingAsync(int orderId)
        {
            // 1. Lấy Order + Nhà hàng + Địa chỉ khách
            var order = await _unitOfWork.Orders.GetByIdWithDetailsAsync(orderId); // Cần đảm bảo hàm này Include "Restaurant" và "Address"
            if (order == null) return null;

            // 2. Tìm Delivery record + Drone + Trạm
            var delivery = (await _unitOfWork.Repository<Delivery>()
                .GetAsync(
                    filter: d => d.OrderID == orderId,
                    includeProperties: "Drone,Drone.DroneStation" // Include thêm DroneStation
                )).OrderByDescending(d => d.DeliveryID).FirstOrDefault();

            var dto = new OrderTrackingDTO
            {
                OrderId = order.OrderID,
                StatusName = order.OrderStatus?.StatusName
            };

            if (delivery == null || delivery.Drone == null)
            {
                dto.NotificationMessage = "Đơn hàng đang chờ xử lý.";
                return dto;
            }

            // --- MAPPING DATA ---
            var drone = delivery.Drone;
            var station = drone.DroneStation;
            var restaurant = order.Restaurant;
            var customerAddress = order.Address;

            dto.DroneModel = drone.Model;
            dto.DroneBattery = drone.CurrentBattery ?? 0;
            dto.CurrentDroneLat = drone.CurrentLocation_Lat ?? 0;
            dto.CurrentDroneLng = drone.CurrentLocation_Lng ?? 0;

            // Tọa độ 3 điểm
            dto.StationLat = station?.Location_Lat ?? 0;
            dto.StationLng = station?.Location_Lng ?? 0;

            dto.RestaurantLat = restaurant?.Location_Lat ?? 0; // Giả sử Restaurant có cột Location
            dto.RestaurantLng = restaurant?.Location_Lng ?? 0;

            dto.DestLat = customerAddress?.Latitude ?? 0;
            dto.DestLng = customerAddress?.Longitude ?? 0;

            // --- LOGIC TÍNH TOÁN THÔNG BÁO (1/3, 2/3, POPUP) ---
            // Chỉ tính khi đơn hàng đang giao (Delivering)
            if (dto.StatusName == "Delivering" || dto.StatusName == "Shipping")
            {
                // Tính khoảng cách Drone -> Nhà hàng (Km)
                double distToRest = CalculateDistance(dto.CurrentDroneLat, dto.CurrentDroneLng, dto.RestaurantLat, dto.RestaurantLng);

                // Tính khoảng cách Drone -> Khách (Km)
                double distToCust = CalculateDistance(dto.CurrentDroneLat, dto.CurrentDroneLng, dto.DestLat, dto.DestLng);

                // Lấy Message hiển thị trạng thái
                dto.NotificationMessage = GenerateTrackingMessage(dto, distToRest, distToCust);

                // --- LOGIC POPUP ĐẾN NHÀ HÀNG (SỬA LẠI) ---
                // Điều kiện: 
                // 1. Khoảng cách < 0.2km (Nới rộng ra 200m để dễ bắt)
                // 2. HOẶC: Drone đang ở rất gần Restaurant hơn là Customer VÀ chưa đi được xa
                if (distToRest < 0.2)
                {
                    dto.ShowPopup = true;
                    // Ghi đè message ưu tiên
                    dto.NotificationMessage = "Drone đang ở tại nhà hàng để lấy món!";
                }
            }
            return dto;
        }

        // --- HELPER FUNCTIONS (Tính toán Logic thông báo) ---

        private string GenerateTrackingMessage(OrderTrackingDTO dto, double distToRest, double distToCust)
        {
            // Tổng quãng đường (Nhà hàng -> Khách)
            double totalDist = CalculateDistance(dto.RestaurantLat, dto.RestaurantLng, dto.DestLat, dto.DestLng);

            // 1. Nếu Drone đang ở gần Trạm hơn Nhà hàng (đang đi lấy hàng)
            // Logic: Khoảng cách tới Khách > Tổng quãng đường giao hàng
            if (distToCust > totalDist && distToRest > 0.2)
            {
                return $"Đang bay đến nhà hàng... (Cách {distToRest:0.0} km)";
            }

            // 2. Nếu đã lấy hàng và đang đi giao
            // Tính % đã đi được
            double traveled = totalDist - distToCust;
            double progress = (totalDist > 0) ? (traveled / totalDist) : 0;

            if (progress >= 0.8) return "Tài xế Drone sắp đến trước cửa nhà bạn!";
            if (progress >= 0.5) return $"Đang giao hàng... Còn cách {distToCust:0.0} km";
            if (progress >= 0.1) return "Đã lấy món xong. Đang bay tới chỗ bạn.";

            return "Drone đang chuẩn bị rời nhà hàng.";
        }
        // Hàm tính khoảng cách Haversine (tính theo Km)
        private double CalculateDistance(decimal lat1, decimal lng1, decimal lat2, decimal lng2)
        {
            double r = 6371; // Bán kính trái đất km
            double dLat = ToRadians((double)(lat2 - lat1));
            double dLon = ToRadians((double)(lng2 - lng1));
            double a = Math.Sin(dLat / 2) * Math.Sin(dLat / 2) +
                       Math.Cos(ToRadians((double)lat1)) * Math.Cos(ToRadians((double)lat2)) *
                       Math.Sin(dLon / 2) * Math.Sin(dLon / 2);
            double c = 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));
            return r * c;
        }

        private double ToRadians(double angle)
        {
            return Math.PI * angle / 180.0;
        }
        public async Task<UpdateStatusResult> ConfirmOrderAsAdminAsync(int orderId)
        {
            // 1. Lấy thông tin Order (không cần check quyền Manager)
            var order = await _unitOfWork.Orders.GetByIdWithDetailsAsync(orderId);
            if (order == null) return UpdateStatusResult.OrderNotFound;

            // 2. Kiểm tra trạng thái hiện tại
            if (order.OrderStatus?.StatusName != "Pending")
                return UpdateStatusResult.AlreadyProcessed;

            // 3. Kiểm tra thanh toán (Admin vẫn nên tuân thủ quy tắc này)
            var successStatus = (await _unitOfWork.Repository<PaymentTransactionStatus>()
                .FindAsync(s => s.StatusName == "Success")).FirstOrDefault();

            if (successStatus != null)
            {
                var payment = (await _unitOfWork.Repository<PaymentTransaction>().FindAsync(
                    p => p.OrderID == orderId && p.StatusID == successStatus.StatusID
                )).FirstOrDefault();

                if (payment == null) return UpdateStatusResult.NotPaid;
            }

            // 4. Cập nhật trạng thái sang "Confirmed"
            return await UpdateStatusAsync(orderId, "Confirmed");
        }
        public async Task<bool> UpdateStatusAsAdminAsync(int orderId, int statusId)
        {
            var order = await _unitOfWork.Orders.GetByIdAsync(orderId);
            if (order == null) return false;

            // Admin quyền lực tối cao, đổi status trực tiếp
            order.StatusID = statusId;
            order.UpdatedAt = DateTime.UtcNow;

            _unitOfWork.Orders.Update(order);
            await _unitOfWork.SaveChangesAsync();
            return true;
        }
        private OrderDTO MapToDTO(Order o)
        {
            return new OrderDTO
            {
                OrderID = o.OrderID,
                UserID = o.UserID,
                AdrsID = o.AdrsID,
                RestaurantID = o.RestaurantID,
                RestaurantName = o.Restaurant?.Name,
                RestaurantAddress = o.Restaurant?.Address,
                OrderTime = o.OrderTime,
                StatusID = o.StatusID,
                StatusName = o.OrderStatus?.StatusName,
                TotalAmount = o.TotalAmount,
                UpdatedAt = o.UpdatedAt,
                Items = o.OrderItems.Select(i => new OrderItemDTO
                {
                    FoodID = i.FoodID,
                    FoodName = i.FoodItem?.FoodName,
                    FoodImageUrl = i.FoodItem?.ImageURL,
                    Quantity = i.Quantity,
                    Price = i.Price
                }).ToList(),
            };
        }
    }
}