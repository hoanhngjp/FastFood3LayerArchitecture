using DAT.Entity;
using DAT.UnitOfWork;
using DTO.DTO.Delivery;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace BUS.Services.DeliveryService
{
    public class DeliveryService : IDeliveryService
    {
        private readonly IUnitOfWork _uow;

        public DeliveryService(IUnitOfWork uow)
        {
            _uow = uow;
        }

        public async Task<IEnumerable<DeliveryDTO>> GetAllForAdminAsync()
        {
            // SỬA LỖI: Dùng GetAsync với includeProperties chuỗi (cách bạn dùng ở DroneService)
            // Lưu ý cú pháp include lồng nhau: "Order.User"
            var deliveries = await _uow.Repository<Delivery>()
                .GetAsync(includeProperties: "Order,Order.User,Drone,DeliveryStatus");

            // Sắp xếp giảm dần theo ID
            return deliveries.OrderByDescending(d => d.DeliveryID).Select(MapToDTO);
        }

        public async Task<DeliveryDTO?> GetByIdAsync(int id)
        {
            var deliveries = await _uow.Repository<Delivery>()
                .GetAsync(
                    filter: d => d.DeliveryID == id,
                    includeProperties: "Order,Order.User,Drone,DeliveryStatus"
                );

            var d = deliveries.FirstOrDefault();
            return d == null ? null : MapToDTO(d);
        }

        public async Task<bool> UpdateStatusAsAdminAsync(int deliveryId, int statusId)
        {
            var delivery = await _uow.Repository<Delivery>().GetByIdAsync(deliveryId);
            if (delivery == null) return false;

            delivery.StatusID = statusId;

            // Logic cập nhật thời gian thực dựa trên StatusID mới của bạn
            // 2: Picking Up, 3: Dropping Off, 4: Completed
            if (statusId == 2) // Picking Up -> Bắt đầu lấy hàng
            {
                // Có thể gán ActualPickupTime nếu chưa có
                if (!delivery.ActualPickupTime.HasValue) delivery.ActualPickupTime = DateTime.UtcNow;
            }
            else if (statusId == 4) // Completed -> Giao xong
            {
                delivery.ActualDropoffTime = DateTime.UtcNow;
            }

            _uow.Repository<Delivery>().Update(delivery);
            await _uow.SaveChangesAsync();
            return true;
        }

        private DeliveryDTO MapToDTO(Delivery d)
        {
            // Mapping Status theo danh sách bạn cung cấp
            string statusName = d.DeliveryStatus?.StatusName;
            // Nếu null thì switch case backup (phòng khi chưa join bảng)
            if (string.IsNullOrEmpty(statusName))
            {
                statusName = d.StatusID switch
                {
                    1 => "Assigning Drone",
                    2 => "Picking Up",
                    3 => "Dropping Off",
                    4 => "Completed",
                    5 => "Failed",
                    6 => "Busy",
                    _ => "Unknown"
                };
            }

            return new DeliveryDTO
            {
                DeliveryID = d.DeliveryID,
                OrderID = d.OrderID,
                CustomerName = d.Order?.User?.FullName ?? "Khách vãng lai",
                DroneID = d.DroneID,
                DroneModel = d.Drone?.Model ?? "N/A",
                // SerialNumber đã bỏ

                EstimatedPickup = d.EstimatedPickupTime,
                EstimatedDropoff = d.EstimatedDropoffTime,
                PickupTime = d.ActualPickupTime,
                DropoffTime = d.ActualDropoffTime,

                StatusID = d.StatusID,
                StatusName = statusName
            };
        }
    }
}
