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
            // Giả sử 2 là Confirmed (sẵn sàng giao)
            if (order == null || order.StatusID != 2)
                return "Đơn hàng không hợp lệ hoặc chưa sẵn sàng.";

            // 2. Kiểm tra Drone VÀ Load thông tin Trạm (DroneStation)
            // SỬA: Dùng GetAsync để Include "DroneStation" lấy tọa độ trạm
            var drones = await _uow.Repository<Drone>().GetAsync(
                filter: d => d.DroneID == dto.DroneId,
                includeProperties: "DroneStation"
            );
            var drone = drones.FirstOrDefault();

            // Giả sử 1 là Idle (Rảnh)
            if (drone == null || drone.StatusID != 1)
                return "Drone không tồn tại hoặc đang bận.";

            // 3. Tạo Delivery Record
            var delivery = new Delivery
            {
                OrderID = dto.OrderId,
                DroneID = dto.DroneId,

                // SỬA: Thời gian Pickup không phải là Now, mà là Now + Thời gian bay từ Trạm đến Quán
                EstimatedPickupTime = DateTime.UtcNow.AddSeconds(60), // Giả sử mất 10p để đến quán
                EstimatedDropoffTime = DateTime.UtcNow.AddSeconds(120), // Giả sử tổng cộng 30p

                StatusID = 1 // Status 1: "Assigned"
            };

            await _uow.Repository<Delivery>().AddAsync(delivery);

            // 4. QUAN TRỌNG: Reset vị trí Drone về Trạm (Điểm xuất phát)
            // Để logic tính toán đường đi (Trạm -> Nhà hàng) ở Client/Service hoạt động đúng
            if (drone.DroneStation != null)
            {
                drone.CurrentLocation_Lat = drone.DroneStation.Location_Lat;
                drone.CurrentLocation_Lng = drone.DroneStation.Location_Lng;
            }

            // 5. Cập nhật Drone -> Busy
            var busyStatus = (await _uow.Repository<DroneStatus>().FindAsync(s => s.StatusName == "Busy")).FirstOrDefault();
            if (busyStatus != null)
                drone.StatusID = busyStatus.StatusID;

            // 6. Cập nhật Order -> Delivering
            var deliveringStatus = (await _uow.Repository<OrderStatus>().FindAsync(s => s.StatusName == "Delivering")).FirstOrDefault();
            if (deliveringStatus != null)
                order.StatusID = deliveringStatus.StatusID;

            // 7. Lưu thay đổi
            _uow.Repository<Drone>().Update(drone);
            _uow.Orders.Update(order);

            await _uow.SaveChangesAsync();
            return "Success";
        }
        public async Task<bool> UpdateAsAdminAsync(int id, UpdateDroneDTO dto)
        {
            var entity = await _uow.Repository<Drone>().GetByIdAsync(id);
            if (entity == null) return false;

            entity.Model = dto.Model;
            entity.CurrentBattery = dto.CurrentBattery;
            entity.MaxLoad = dto.MaxLoad;
            entity.StatusID = dto.StatusID;

            // Nếu đổi trạm, cập nhật luôn vị trí về trạm mới (Logic tùy chọn)
            if (entity.StationID != dto.StationID)
            {
                var newStation = await _uow.Repository<DroneStation>().GetByIdAsync(dto.StationID);
                if (newStation != null)
                {
                    entity.StationID = dto.StationID;
                    entity.CurrentLocation_Lat = newStation.Location_Lat;
                    entity.CurrentLocation_Lng = newStation.Location_Lng;
                }
            }

            _uow.Repository<Drone>().Update(entity);
            await _uow.SaveChangesAsync();
            return true;
        }

        public async Task<IEnumerable<DroneStationDTO>> GetAllStationsAsync()
        {
            var stations = await _uow.Repository<DroneStation>().GetAllAsync();
            return stations.Select(s => new DroneStationDTO
            {
                StationID = s.StationID,
                Name = s.Name,
                Address = s.Address
            });
        }

        // Helper Map
        private DroneDTO MapToDTO(Drone d)
        {
            string statusName = d.StatusID switch
            {
                1 => "Idle",
                2 => "Charging",
                3 => "Delivering",
                4 => "Busy",
                9 => "Maintenance",
                _ => "Unknown"
            };
            return new DroneDTO
            {
                DroneID = d.DroneID,
                Model = d.Model,
                CurrentBattery = d.CurrentBattery ?? 0,
                MaxLoad = d.MaxLoad ?? 0,
                CurrentLat = d.CurrentLocation_Lat,
                CurrentLng = d.CurrentLocation_Lng,
                StationID = d.StationID,
                StationName = d.DroneStation?.Name ?? "Unknown Station",
                StatusName = statusName
            };
        }
    }
}
