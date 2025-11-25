using DAT.Entity;
using DAT.UnitOfWork;
using DTO.DTO;
using DTO.DTO.Restaurant;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace BUS.Services.RestaurantService
{
    public class RestaurantService : IRestaurantService
    {
        private readonly IUnitOfWork _uow;
        public RestaurantService(IUnitOfWork unitOfWork)
        {
            _uow = unitOfWork;
        }
        public async Task<IEnumerable<RestaurantDTO>> GetAllAsync()
        {
            var entities = await _uow.Restaurants.GetAllWithStatusAsync();

            // Cải tiến: Chỉ hiển thị nhà hàng "Open" cho khách
            var openRestaurants = entities.Where(r => r.RestaurantStatus?.StatusName == "Opening");
            return openRestaurants.Select(MapToDTO);
        }
        public async Task<RestaurantDTO?> GetByIdAsync(int id)
        {
            var entity = await _uow.Restaurants.GetByIdWithStatusAsync(id);
            if (entity == null) return null;
            return MapToDTO(entity);
        }
        private async Task<Restaurant?> CheckOwnershipAndGetAsync(int managerRestaurantId)
        {
            var entity = await _uow.Restaurants.GetByIdWithStatusAsync(managerRestaurantId);

            if (entity == null)
            {
                return null;
            }

            return entity;
        }
        public async Task<RestaurantResult> UpdateRestaurantInfoAsync(RestaurantUpdateDTO dto, int managerRestaurantId)
        {
            // 1. Kiểm tra quyền và lấy entity
            var entity = await CheckOwnershipAndGetAsync(managerRestaurantId);
            if (entity == null)
                return RestaurantResult.NotFound;

            // 2. Cập nhật các trường
            entity.Name = dto.Name;
            entity.Address = dto.Address;
            entity.PhoneNumber = dto.PhoneNumber;
            entity.OpeningHours = dto.OpeningHours;
            entity.Location_Lat = dto.Location_Lat;
            entity.Location_Lng = dto.Location_Lng;

            // 3. Lưu thay đổi
            _uow.Restaurants.Update(entity);
            await _uow.SaveChangesAsync();

            return RestaurantResult.Success;
        }
        public async Task<RestaurantResult> ToggleRestaurantStatusAsync(bool isOpen, int managerRestaurantId)
        {
            // 1. Kiểm tra quyền và lấy entity
            var entity = await CheckOwnershipAndGetAsync(managerRestaurantId);
            if (entity == null)
                return RestaurantResult.NotFound;

            // 2. Tìm StatusID mong muốn
            var statusName = isOpen ? "Opening" : "Closed";
            var targetStatus = (await _uow.Repository<RestaurantStatus>()
                                    .FindAsync(s => s.StatusName == statusName))
                                    .FirstOrDefault();

            if (targetStatus == null)
                throw new InvalidOperationException($"Lỗi CSDL: Chưa seed '{statusName}' cho RestaurantStatus.");

            // 3. Cập nhật
            entity.StatusID = targetStatus.StatusID;

            // 4. Lưu thay đổi
            _uow.Restaurants.Update(entity);
            await _uow.SaveChangesAsync();

            return RestaurantResult.Success;
        }
        private RestaurantDTO MapToDTO(Restaurant r)
        {
            return new RestaurantDTO
            {
                RestaurantID = r.RestaurantID,
                Name = r.Name,
                Address = r.Address,
                PhoneNumber = r.PhoneNumber,
                OpeningHours = r.OpeningHours,
                Location_Lat = r.Location_Lat,
                Location_Lng = r.Location_Lng,
                StatusID = r.StatusID,
                StatusName = r.RestaurantStatus?.StatusName
            };
        }
    }
}
