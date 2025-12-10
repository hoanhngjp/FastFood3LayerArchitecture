using DAT.UnitOfWork;
using DTO.DTO;
using DTO.DTO.Category;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace BUS.Services
{
    public class CategoryService : ICategoryService
    {
        private readonly IUnitOfWork _unitOfWork;

        public CategoryService(IUnitOfWork unitOfWork)
        {
            _unitOfWork = unitOfWork;
        }

        public async Task<IEnumerable<CategoryDTO>> GetAllAsync()
        {
            var categories = await _unitOfWork.Categories.GetAllAsync();
            // CẢI TIẾN D.R.Y: Dùng hàm MapToDTO
            return categories.Select(MapToDTO);
        }

        public async Task<CategoryDTO?> GetByIdAsync(int id)
        {
            var c = await _unitOfWork.Categories.GetByIdAsync(id);
            if (c == null) return null;

            // CẢI TIẾN D.R.Y: Dùng hàm MapToDTO
            return MapToDTO(c);
        }

        public async Task<CategoryDTO> AddAsync(CreateCategoryDTO dto)
        {
            var entity = new DAT.Entity.Category
            {
                Name = dto.Name,
                Description = dto.Description,
                ImageURL = dto.ImgUrl
            };
            await _unitOfWork.Categories.AddAsync(entity);
            await _unitOfWork.SaveChangesAsync();

            return MapToDTO(entity);
        }

        public async Task<bool> UpdateAsync(int id, UpdateCategoryDTO dto)
        {
            var entity = await _unitOfWork.Categories.GetByIdAsync(id);

            if (entity == null)
                return false;

            // Ánh xạ các thay đổi
            entity.Name = dto.Name;
            entity.Description = dto.Description;
            entity.ImageURL = dto.ImgUrl;

            _unitOfWork.Categories.Update(entity);
            await _unitOfWork.SaveChangesAsync();
            return true; // Báo cáo thành công
        }

        public async Task<bool> DeleteAsync(int id)
        {
            var entity = await _unitOfWork.Categories.GetByIdAsync(id);
            if (entity == null) return false;

            _unitOfWork.Categories.Remove(entity);
            await _unitOfWork.SaveChangesAsync();
            return true;
        }
        private CategoryDTO MapToDTO(DAT.Entity.Category c)
        {
            return new CategoryDTO
            {
                CategoryId = c.CategoryID,
                Name = c.Name,
                Description = c.Description,
                ImgUrl = c.ImageURL
            };
        }
    }

}
