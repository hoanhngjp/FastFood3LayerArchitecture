using DTO.DTO;
using DTO.DTO.Restaurant;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace BUS.Services.RestaurantService
{
    public interface IRestaurantService
    {
        Task<IEnumerable<RestaurantDTO>> GetAllAsync();
        Task<RestaurantDTO?> GetByIdAsync(int id);
        Task<RestaurantResult> UpdateRestaurantInfoAsync(RestaurantUpdateDTO dto, int managerRestaurantId);
        Task<RestaurantResult> ToggleRestaurantStatusAsync(bool isOpen, int managerRestaurantId);
    }
}
