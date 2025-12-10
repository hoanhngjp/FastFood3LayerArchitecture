using DAT.Entity;
using DAT.UnitOfWork;
using DTO.DTO;
using DTO.DTO.Restaurant;
using DTO.DTO.User;

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
        public async Task<IEnumerable<dynamic>> GetManagersAsync()
        {
            // Giả sử RoleID = 3 là Manager. Bạn nên dùng Enum hoặc Constant cho chuẩn
            var managers = await _uow.Repository<User>()
                                     .FindAsync(u => u.RoleID == 3);

            return managers.Select(u => new
            {
                UserID = u.UserID,
                FullName = u.FullName,
                Email = u.Email
            });
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

            // 2. Cập nhật các trường thông tin cơ bản
            // (Có thể thêm check !string.IsNullOrEmpty nếu muốn tránh xóa nhầm dữ liệu)
            entity.Name = dto.Name;
            entity.Address = dto.Address;
            entity.PhoneNumber = dto.PhoneNumber;
            entity.OpeningHours = dto.OpeningHours;

            // 3. LOGIC QUAN TRỌNG: Chỉ cập nhật tọa độ nếu DTO có giá trị
            // Nếu JS không gửi (null), tọa độ cũ trong DB được giữ nguyên.
            if (dto.Location_Lat.HasValue && dto.Location_Lng.HasValue)
            {
                entity.Location_Lat = dto.Location_Lat.Value;
                entity.Location_Lng = dto.Location_Lng.Value;
            }

            // 4. Lưu thay đổi
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
        // --- IMPLEMENT ADMIN METHODS ---

        public async Task<IEnumerable<RestaurantDTO>> GetAllForAdminAsync()
        {

            var allRestaurants = await _uow.Repository<Restaurant>().GetAllAsync();

            var statuses = await _uow.Repository<RestaurantStatus>().GetAllAsync();

            var result = allRestaurants.Select(r => {
                var status = statuses.FirstOrDefault(s => s.StatusID == r.StatusID);
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
                    StatusName = status?.StatusName ?? "Unknown"
                };
            });

            return result;
        }

        public async Task<RestaurantDTO> AddAsAdminAsync(CreateRestaurantDTO dto)
        {
            var defaultStatus = (await _uow.Repository<RestaurantStatus>().FindAsync(s => s.StatusName == "Opening")).FirstOrDefault();
            int statusId = defaultStatus?.StatusID ?? 1;

            // Validate Manager (Tùy chọn: Kiểm tra xem ID có tồn tại và đúng role không)
            var manager = await _uow.Repository<User>().GetByIdAsync(dto.ManagerID);
            if (manager == null || manager.RoleID != 3)
                throw new Exception("ManagerID không hợp lệ hoặc không phải là Quản lý.");

            var entity = new Restaurant
            {
                Name = dto.Name,
                Address = dto.Address,
                PhoneNumber = dto.PhoneNumber,
                OpeningHours = dto.OpeningHours,
                Location_Lat = dto.Location_Lat,
                Location_Lng = dto.Location_Lng,
                StatusID = statusId,

                // GÁN MANAGER TỪ DTO
                ManagerID = dto.ManagerID,
            };

            await _uow.Restaurants.AddAsync(entity);
            await _uow.SaveChangesAsync();

            entity.RestaurantStatus = defaultStatus;
            return MapToDTO(entity);
        }

        public async Task<bool> UpdateAsAdminAsync(int id, RestaurantUpdateDTO dto)
        {
            var entity = await _uow.Restaurants.GetByIdAsync(id);
            if (entity == null) return false;

            entity.Name = dto.Name;
            entity.Address = dto.Address;
            entity.PhoneNumber = dto.PhoneNumber;
            entity.OpeningHours = dto.OpeningHours;
            entity.Location_Lat = dto.Location_Lat;
            entity.Location_Lng = dto.Location_Lng;
            entity.StatusID = dto.StatusID.Value;

            // CẬP NHẬT MANAGER
            entity.ManagerID = dto.ManagerID;

            _uow.Restaurants.Update(entity);
            await _uow.SaveChangesAsync();
            return true;
        }

        public async Task<bool> DeleteAsAdminAsync(int id)
        {
            var entity = await _uow.Restaurants.GetByIdAsync(id);
            if (entity == null) return false;

            _uow.Restaurants.Remove(entity);
            await _uow.SaveChangesAsync();
            return true;
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
                StatusName = r.RestaurantStatus?.StatusName,
                ManagerID = r.ManagerID
            };
        }
    }
}
