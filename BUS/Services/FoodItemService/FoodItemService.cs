using BUS.Services;
using DAT.Entity;
using DAT.UnitOfWork;
using DTO.DTO;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

public class FoodItemService : IFoodItemService
{
    private readonly IUnitOfWork _unitOfWork;

    public FoodItemService(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    public async Task<IEnumerable<FoodItemDTO>> GetAllAsync()
    {
        var items = await _unitOfWork.FoodItems.GetAllWithDetailsAsync();
        // CẢI TIẾN: Dùng hàm MapToDTO
        return items.Select(MapToDTO);
    }

    public async Task<IEnumerable<FoodItemDTO>> GetFoodsByCategoryAsync(int categoryId)
    {
        var items = await _unitOfWork.FoodItems.GetByCategoryWithDetailsAsync(categoryId);

        return items.Select(MapToDTO);
    }

    public async Task<FoodItemDTO?> GetByIdAsync(int id)
    {
        var f = await _unitOfWork.FoodItems.GetByIdWithDetailsAsync(id);
        if (f == null) return null;

        return MapToDTO(f);
    }

    public async Task AddAsync(FoodItemDTO dto)
    {
        var entity = new DAT.Entity.FoodItem
        {
            FoodName = dto.FoodName,
            Description = dto.Description,
            Price = dto.Price,
            ImageURL = dto.ImgUrl,
            StatusID = dto.StatusID,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            CategoryID = dto.CategoryId
        };
        await _unitOfWork.FoodItems.AddAsync(entity);
        await _unitOfWork.SaveChangesAsync();
    }
    public async Task<bool> UpdateAsync(FoodItemDTO dto)
    {
        var entity = await _unitOfWork.FoodItems.GetByIdAsync(dto.FoodId);

        if (entity == null)
            return false;

        entity.FoodName = dto.FoodName;
        entity.Description = dto.Description;
        entity.Price = dto.Price;
        entity.ImageURL = dto.ImgUrl;
        entity.StatusID = dto.StatusID;
        entity.UpdatedAt = DateTime.UtcNow;
        entity.CategoryID = dto.CategoryId;

        _unitOfWork.FoodItems.Update(entity);
        await _unitOfWork.SaveChangesAsync();

        return true;
    }

    public async Task<bool> DeleteAsync(int id)
    {
        var entity = await _unitOfWork.FoodItems.GetByIdAsync(id);
        if (entity == null)
            return false;

        _unitOfWork.FoodItems.Remove(entity);
        await _unitOfWork.SaveChangesAsync();
        return true;
    }

    private FoodItemDTO MapToDTO(FoodItem f)
    {
        return new FoodItemDTO
        {
            FoodId = f.FoodID,
            FoodName = f.FoodName,
            Description = f.Description,
            Price = f.Price,
            ImgUrl = f.ImageURL,
            StatusID = f.StatusID,
            StatusName = f.FoodStatus?.StatusName,
            CreatedAt = f.CreatedAt,
            UpdatedAt = f.UpdatedAt,
            CategoryId = f.CategoryID,
            CategoryName = f.Category?.Name
        };
    }
}