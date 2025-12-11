using DAT.Entity;
using DAT.UnitOfWork;
using DTO.DTO;
using DTO.DTO.User;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace BUS.Services
{
    public class UserService : IUserService
    {
        private readonly IUnitOfWork _unitOfWork;

        public UserService(IUnitOfWork unitOfWork)
        {
            _unitOfWork = unitOfWork;
        }

        public async Task<IEnumerable<UserDTO>> GetAllUsersAsync()
        {
            var users = await _unitOfWork.Users.GetAllWithRolesAsync();
            return users.Select(MapToDTO);
        }

        public async Task<UserDTO?> GetUserByIdAsync(int id)
        {
            var user = await _unitOfWork.Users.GetByIdWithRoleAsync(id);
            if (user == null) return null;
            return MapToDTO(user);
        }

        public async Task<bool> AddUserAsync(CreateUser request) // SỬA: Trả về UserDTO
        {
            var roleName = string.IsNullOrEmpty(request.RoleName) ? "customer" : request.RoleName;
            var role = (await _unitOfWork.UserRoles.FindAsync(r => r.RoleName == roleName)).FirstOrDefault();

            // SỬA: "Ném" lỗi 400 (Bad Request) nếu Role tào lao
            if (role == null)
                throw new ArgumentException($"Role '{roleName}' not found.");

            if (string.IsNullOrWhiteSpace(request.Password))
                throw new ArgumentException("Password is required to create a user.");

            // Kiểm tra Email trùng (bạn đã làm ở AuthService, nên làm ở đây luôn)
            if (await _unitOfWork.Users.GetByEmailAsync(request.Email) != null)
                throw new InvalidOperationException("Email already exists."); // Lỗi 409 Conflict

            var passwordHash = BCrypt.Net.BCrypt.HashPassword(request.Password);
            var user = new User
            {
                FullName = request.FullName,
                Email = request.Email,
                PasswordHash = passwordHash,
                DOB = request.DOB,
                RoleID = role.RoleID,
                AvatarURL = request.AvatarURL,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            await _unitOfWork.Users.AddAsync(user);
            return await _unitOfWork.SaveChangesAsync() > 0;

        }

        public async Task<bool> UpdateUserAsync(UpdateUser request)
        {
            var user = await _unitOfWork.Users.GetByIdAsync(request.UserID);

            // SỬA: "Ném" lỗi 404 (Not Found)
            if (user == null)
                return false;

            // Cập nhật RoleID (nếu có)
            if (!string.IsNullOrEmpty(request.RoleName) && user.UserRole?.RoleName != request.RoleName)
            {
                var role = (await _unitOfWork.UserRoles.FindAsync(r => r.RoleName == request.RoleName)).FirstOrDefault();

                // SỬA: "Ném" lỗi 400 (Bad Request) nếu Role tào lao
                if (role == null)
                    throw new ArgumentException($"Role '{request.RoleName}' not found.");
                user.RoleID = role.RoleID;
            }

            user.FullName = request.FullName;
            user.Email = request.Email;
            user.DOB = request.DOB;
            user.AvatarURL = request.AvatarURL;
            user.UpdatedAt = DateTime.UtcNow;

            if (!string.IsNullOrEmpty(request.Password))
            {
                user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password);
            }

            _unitOfWork.Users.Update(user);
            await _unitOfWork.SaveChangesAsync();
            return true;
        }

        public async Task<bool> DeleteUserAsync(int id)
        {
            var entity = await _unitOfWork.Users.GetByIdAsync(id);
            if (entity == null) return false;

            _unitOfWork.Users.Remove(entity);
            await _unitOfWork.SaveChangesAsync();
            return true;
        }
        public async Task<PagedResult<UserDTO>> GetUsersPagingAsync(UserFilterRequest request)
        {
            // SỬA: Thay 'var' bằng 'IQueryable<User>'
            // Việc này ép kiểu ngay từ đầu về IQueryable chung nhất, giúp các lệnh Where sau đó hoạt động bình thường.
            IQueryable<User> query = _unitOfWork.Users.GetQuery()
                            .Include(u => u.UserRole)
                            .Include(u => u.Orders);

            // 2. Lọc theo Keyword
            if (!string.IsNullOrEmpty(request.Keyword))
            {
                var key = request.Keyword.ToLower();
                query = query.Where(u => u.FullName.ToLower().Contains(key) ||
                                         u.Email.ToLower().Contains(key));
            }

            // 3. Lọc theo Role
            if (!string.IsNullOrEmpty(request.Role) && request.Role != "All")
            {
                query = query.Where(u => u.UserRole.RoleName == request.Role);
            }

            // 4. Tính toán phân trang
            int totalCount = await query.CountAsync();

            var items = await query
                .OrderByDescending(u => u.CreatedAt)
                .Skip((request.PageIndex - 1) * request.PageSize)
                .Take(request.PageSize)
                .Select(u => new UserDTO
                {
                    UserID = u.UserID,
                    FullName = u.FullName,
                    Email = u.Email,
                    RoleName = u.UserRole.RoleName,
                    CreatedAt = u.CreatedAt,
                    OrderCount = u.Orders.Count
                })
                .ToListAsync();

            return new PagedResult<UserDTO>
            {
                Items = items,
                TotalCount = totalCount,
                PageIndex = request.PageIndex,
                PageSize = request.PageSize
            };
        }
        public async Task<IEnumerable<RoleDTO>> GetAllRolesAsync()
        {
            var roles = await _unitOfWork.UserRoles.GetAllAsync();
            return roles.Select(r => new RoleDTO
            {
                RoleID = r.RoleID,
                RoleName = r.RoleName
            });
        }
        private UserDTO MapToDTO(User u)
        {
            return new UserDTO
            {
                UserID = u.UserID,
                FullName = u.FullName,
                Email = u.Email,
                DOB = u.DOB,
                RoleID = u.RoleID,
                RoleName = u.UserRole?.RoleName,
                AvatarURL = u.AvatarURL,
                CreatedAt = u.CreatedAt,
                UpdatedAt = u.UpdatedAt,
                OrderCount = u.Orders?.Count
            };
        }
    }
}