using DTO.DTO;
using DTO.DTO.FoodItem;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace BUS.Services
{
    public interface IFoodItemService
    {
        Task<IEnumerable<FoodItemResponseDTO>> GetAllAsync();
        Task<IEnumerable<FoodItemResponseDTO>> GetFoodsByCategoryAsync(int categoryId);
        Task<FoodItemResponseDTO?> GetByIdAsync(int id);
        Task<FoodItemResponseDTO> AddAsync(CreateFoodItemDTO dto);
        Task<bool> UpdateAsync(int id, UpdateFoodItemDTO dto);
        Task<bool> DeleteAsync(int id);
    }

}
