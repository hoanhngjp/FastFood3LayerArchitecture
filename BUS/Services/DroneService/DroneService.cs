using DAT.Entity;
using DAT.UnitOfWork;
using DTO.DTO.Drone;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace BUS.Services.DroneService
{
    public class DroneService : IDroneService
    {
        private readonly IUnitOfWork _uow;

        public DroneService(IUnitOfWork uow)
        {
            _uow = uow;
        }

        public async Task<IEnumerable<DroneDTO>> GetAllAsync()
        {
            var drones = await _uow.Repository<Drone>()
                .GetAsync(includeProperties: "DroneStation,DroneStatus");
            return drones.Select(MapToDTO);
        }
        public async Task<DroneDTO?> GetByIdAsync(int id)
        {
            var drone = (await _uow.Repository<Drone>()
                .GetAsync(filter: d => d.DroneID == id, includeProperties: "DroneStation,DroneStatus"))
                .FirstOrDefault();
            return drone == null ? null : MapToDTO(drone);
        }
        public async Task<bool> CreateAsync(CreateDroneDTO dto)
        {
            var idleStatus = (await _uow.Repository<DroneStatus>()
                .FindAsync(s => s.StatusName == "Idle")).FirstOrDefault();

            if (idleStatus == null) throw new Exception("Status 'Idle' not found in DB");

            // Lấy tọa độ của trạm để set vị trí ban đầu cho Drone
            var station = await _uow.Repository<DroneStation>().GetByIdAsync(dto.StationID);
            if (station == null) throw new Exception("Station not found");

            var drone = new Drone
            {
                Model = dto.Model,
                CurrentBattery = dto.CurrentBattery ?? 100, // Default 100%
                MaxLoad = dto.MaxLoad,
                StationID = dto.StationID,
                StatusID = idleStatus.StatusID,
                // Set vị trí ban đầu theo trạm
                CurrentLocation_Lat = station.Location_Lat,
                CurrentLocation_Lng = station.Location_Lng
            };

            await _uow.Repository<Drone>().AddAsync(drone);
            await _uow.SaveChangesAsync();
            return true;
        }
        public async Task<bool> DeleteAsync(int id)
        {
            var drone = await _uow.Repository<Drone>().GetByIdAsync(id);
            if (drone == null) return false;

            _uow.Repository<Drone>().Remove(drone);
            await _uow.SaveChangesAsync();
            return true;
        }

        public async Task<bool> UpdateStatusAsync(int droneId, string statusName)
        {
            var drone = await _uow.Repository<Drone>().GetByIdAsync(droneId);
            if (drone == null) return false;

            var status = (await _uow.Repository<DroneStatus>().FindAsync(s => s.StatusName == statusName)).FirstOrDefault();
            if (status == null) return false;

            drone.StatusID = status.StatusID;
            _uow.Repository<Drone>().Update(drone);
            await _uow.SaveChangesAsync();
            return true;
        }

        public async Task<string> AssignOrderAsync(AssignDroneDTO dto)
        {
            // 1. Kiểm tra Order
            var order = await _uow.Orders.GetByIdAsync(dto.OrderId);
            if (order == null || order.StatusID != 2) // Giả sử 2 là Confirmed (sẵn sàng giao)
                return "Đơn hàng không hợp lệ hoặc chưa sẵn sàng.";

            // 2. Kiểm tra Drone
            var drone = await _uow.Repository<Drone>().GetByIdAsync(dto.DroneId);
            if (drone == null || drone.StatusID != 1) // Giả sử 1 là Idle
                return "Drone không tồn tại hoặc đang bận.";

            // 3. Tạo Delivery Record theo Entity mới
            var delivery = new Delivery
            {
                OrderID = dto.OrderId,
                DroneID = dto.DroneId,

                EstimatedPickupTime = DateTime.UtcNow.AddMinutes(10),
                EstimatedDropoffTime = DateTime.UtcNow.AddMinutes(30),

                StatusID = 1 // Status 1: "Assigned" hoặc "In Progress" (tùy bảng DeliveryStatus)
            };

            await _uow.Repository<Delivery>().AddAsync(delivery);

            // 4. Cập nhật Drone -> Busy
            var busyStatus = (await _uow.Repository<DroneStatus>().FindAsync(s => s.StatusName == "Busy")).FirstOrDefault();
            if (busyStatus != null)
                drone.StatusID = busyStatus.StatusID;

            // 5. Cập nhật Order -> Delivering
            var deliveringStatus = (await _uow.Repository<OrderStatus>().FindAsync(s => s.StatusName == "Delivering")).FirstOrDefault();
            if (deliveringStatus != null)
                order.StatusID = deliveringStatus.StatusID;

            _uow.Repository<Drone>().Update(drone);
            _uow.Orders.Update(order);

            await _uow.SaveChangesAsync();
            return "Success";
        }
        private DroneDTO MapToDTO(Drone d)
        {
            return new DroneDTO
            {
                DroneID = d.DroneID,
                Model = d.Model,
                CurrentBattery = d.CurrentBattery ?? 0,
                MaxLoad = d.MaxLoad ?? 0,
                // Map tọa độ mới
                CurrentLat = d.CurrentLocation_Lat,
                CurrentLng = d.CurrentLocation_Lng,
                StationID = d.StationID,
                StationName = d.DroneStation?.Name ?? "N/A",
                StatusName = d.DroneStatus?.StatusName ?? "Unknown"
            };
        }
    }
}
