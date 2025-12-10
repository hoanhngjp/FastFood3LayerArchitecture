using DAT.Entity;
using DAT.UnitOfWork;
using DTO.DTO.Drone;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace BUS.Services.DroneStationService
{
    public class DroneStationService : IDroneStationService
    {
        private readonly IUnitOfWork _uow;
        public DroneStationService(IUnitOfWork uow) { _uow = uow; }

        public async Task<IEnumerable<DroneStationDTO>> GetAllAsync()
        {
            var list = await _uow.Repository<DroneStation>().GetAllAsync();
            return list.Select(s => new DroneStationDTO
            {
                StationID = s.StationID,
                Name = s.Name,
                Address = s.Address,
                Location_Lat = s.Location_Lat,
                Location_Lng = s.Location_Lng
            });
        }

        public async Task<DroneStationDTO?> GetByIdAsync(int id)
        {
            var s = await _uow.Repository<DroneStation>().GetByIdAsync(id);
            if (s == null) return null;
            return new DroneStationDTO
            {
                StationID = s.StationID,
                Name = s.Name,
                Address = s.Address,
                Location_Lat = s.Location_Lat,
                Location_Lng = s.Location_Lng
            };
        }

        public async Task<bool> AddAsync(CreateStationDTO dto)
        {
            var entity = new DroneStation
            {
                Name = dto.Name,
                Address = dto.Address,
                Location_Lat = dto.Location_Lat,
                Location_Lng = dto.Location_Lng
            };
            await _uow.Repository<DroneStation>().AddAsync(entity);
            await _uow.SaveChangesAsync();
            return true;
        }

        public async Task<bool> UpdateAsync(int id, UpdateStationDTO dto)
        {
            var entity = await _uow.Repository<DroneStation>().GetByIdAsync(id);
            if (entity == null) return false;

            entity.Name = dto.Name;
            entity.Address = dto.Address;
            entity.Location_Lat = dto.Location_Lat;
            entity.Location_Lng = dto.Location_Lng;

            _uow.Repository<DroneStation>().Update(entity);
            await _uow.SaveChangesAsync();
            return true;
        }

        public async Task<bool> DeleteAsync(int id)
        {
            var entity = await _uow.Repository<DroneStation>().GetByIdAsync(id);
            if (entity == null) return false;
            // Cần check xem có Drone nào đang ở trạm này không trước khi xóa
            _uow.Repository<DroneStation>().Remove(entity);
            await _uow.SaveChangesAsync();
            return true;
        }
    }
}
