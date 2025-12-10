using DTO.DTO.Drone;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace BUS.Services.DroneStationService
{
    public interface IDroneStationService
    {
        Task<IEnumerable<DroneStationDTO>> GetAllAsync();
        Task<DroneStationDTO?> GetByIdAsync(int id);
        Task<bool> AddAsync(CreateStationDTO dto);
        Task<bool> UpdateAsync(int id, UpdateStationDTO dto);
        Task<bool> DeleteAsync(int id);
    }
}
