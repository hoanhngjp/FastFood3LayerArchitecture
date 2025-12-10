using DTO.DTO;
using DTO.DTO.User;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace BUS.Services
{
    public interface IUserService
    {
        Task<IEnumerable<UserDTO>> GetAllUsersAsync();
        Task<UserDTO?> GetUserByIdAsync(int id);
        Task<bool> AddUserAsync(CreateUser request);
        Task<bool> UpdateUserAsync(UpdateUser request);
        Task<bool> DeleteUserAsync(int id);
        Task<PagedResult<UserDTO>> GetUsersPagingAsync(UserFilterRequest request);
        Task<IEnumerable<RoleDTO>> GetAllRolesAsync();
    }
}
