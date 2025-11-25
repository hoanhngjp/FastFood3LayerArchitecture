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
            var pendingStatus = (await _unitOfWork.Repository<OrderStatus>()
                                .FindAsync(s => s.StatusName == "Pending"))
                                .FirstOrDefault();

            if (pendingStatus == null)
            {
                throw new InvalidOperationException("LỖI HỆ THỐNG: Không tìm thấy 'Pending' Status. Hãy seed CSDL.");
            }

            int total = 0;
            foreach (var item in dto.Items)
            {
                var food = await _unitOfWork.FoodItems.GetByIdAsync(item.FoodID);

                if (food == null)
                    throw new KeyNotFoundException($"Food item not found: {item.FoodID}");

                item.Price = food.Price;
                total += food.Price * item.Quantity;
            }

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
            await _unitOfWork.SaveChangesAsync();

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
                            o.OrderStatus != null &&
                            o.OrderStatus.StatusName == statusFilter)
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
        private OrderDTO MapToDTO(Order o)
        {
            return new OrderDTO
            {
                OrderID = o.OrderID,
                UserID = o.UserID,
                AdrsID = o.AdrsID,
                RestaurantID = o.RestaurantID,
                OrderTime = o.OrderTime,
                StatusID = o.StatusID,
                StatusName = o.OrderStatus?.StatusName,
                TotalAmount = o.TotalAmount,
                UpdatedAt = o.UpdatedAt,
                Items = o.OrderItems.Select(i => new OrderItemDTO
                {
                    FoodID = i.FoodID,
                    Quantity = i.Quantity,
                    Price = i.Price
                }).ToList(),
            };
        }
    }
}