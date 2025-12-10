using BUS.Services;
using DTO.DTO;
using DTO.DTO.User;
using Microsoft.AspNetCore.Mvc;

namespace WebAPI.Controllers
{
    [ApiController]
    [Route("users")]
    public class UserController : ControllerBase
    {
        private readonly IUserService _userService;

        public UserController(IUserService userService)
        {
            _userService = userService;
        }

        [HttpGet]
        public async Task<IActionResult> GetAllUsers([FromQuery] UserFilterRequest request)
        {
            // Nếu không truyền tham số, mặc định page 1, size 10
            if (request.PageIndex <= 0) request.PageIndex = 1;
            if (request.PageSize <= 0) request.PageSize = 10;

            var result = await _userService.GetUsersPagingAsync(request);
            return Ok(result);
        }

        // API mới để lấy danh sách Roles cho Dropdown
        [HttpGet("roles")]
        public async Task<IActionResult> GetRoles()
        {
            var roles = await _userService.GetAllRolesAsync();
            return Ok(roles);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetUserById(int id)
        {
            var user = await _userService.GetUserByIdAsync(id);
            if (user == null)
                return NotFound(new { message = $"Không tìm thấy user với ID: {id}" });
            return Ok(user);
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateUser request)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            var result = await _userService.AddUserAsync(request);
            if (result) return Ok("Tạo thành công");
            return BadRequest("Tạo thất bại");
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, [FromBody] UpdateUser request) // Dùng UpdateUser
        {
            if (id != request.UserID) return BadRequest("ID không khớp");

            // Lúc này request.Password có thể null, và ModelState vẫn Valid (OK)
            if (!ModelState.IsValid) return BadRequest(ModelState);

            var result = await _userService.UpdateUserAsync(request);
            if (result) return Ok("Cập nhật thành công");
            return BadRequest("Cập nhật thất bại");
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteUser(int id)
        {
            var result = await _userService.DeleteUserAsync(id);
            if (!result)
                return NotFound(new { message = $"Không tìm thấy user với ID: {id}" });

            // Trả về 204 NoContent
            return NoContent();
        }
    }

}
