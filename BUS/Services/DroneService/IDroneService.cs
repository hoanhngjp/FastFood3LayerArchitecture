using DTO.DTO.Drone;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace BUS.Services.DroneService
{
    public interface IDroneService
    {
        Task<IEnumerable<DroneDTO>> GetAllAsync();
        Task<DroneDTO?> GetByIdAsync(int id);
        Task<bool> CreateAsync(CreateDroneDTO dto);
        Task<bool> DeleteAsync(int id);
        Task<bool> UpdateStatusAsync(int droneId, string statusName);
        Task<string> AssignOrderAsync(AssignDroneDTO dto);
    }
}
