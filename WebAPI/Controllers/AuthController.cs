using BUS.Services;
using DTO.DTO;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace WebAPI.Controllers
{
    [ApiController]
    [Route("auth")]
    public class AuthController : ControllerBase
    {
        private readonly IAuthService _auth;

        public AuthController(IAuthService auth) { _auth = auth; }

        [HttpPost("signup")]
        public async Task<IActionResult> Signup([FromBody] SignupRequest req)
        {
            try
            {
                var id = await _auth.SignUpAsync(req);
                return CreatedAtAction(
                "GetUserById", // Tên Action (trong UserController)
                "User",    // Tên Controller
                new { id = id }, // Tham số cho Action
                new { UserID = id } // Body trả về
            );
            }
            catch (ArgumentException ex) { return BadRequest(new { error = ex.Message }); }
            catch (InvalidOperationException ex) { return Conflict(new { error = ex.Message }); }
            catch (Exception ex) { return StatusCode(500, new { error = "Server error", detail = ex.Message }); }
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginRequest req)
        {
            try
            {
                var res = await _auth.LoginAsync(req);

                // Tạo cookie cho Access Token
                var accessCookieOptions = new CookieOptions
                {
                    HttpOnly = true,
                    Secure = false,
                    Expires = res.ExpiresAt, // Hết hạn theo vé
                    SameSite = SameSiteMode.Lax
                };
                Response.Cookies.Append("access_token", res.Token, accessCookieOptions);

                // Tạo cookie cho Refresh Token
                var refreshCookieOptions = new CookieOptions
                {
                    HttpOnly = true,
                    Secure = false,
                    Expires = DateTime.UtcNow.AddDays(7), // Hết hạn 7 ngày
                    SameSite = SameSiteMode.Lax,
                    Path = "/auth" // Chỉ gửi cookie này khi gọi /auth
                };
                Response.Cookies.Append("refresh_token", res.RefreshToken, refreshCookieOptions);

                return Ok(new { UserID = res.UserID });
            }
            catch (ArgumentException ex) { return BadRequest(new { error = ex.Message }); }
            catch (UnauthorizedAccessException ex) { return Unauthorized(new { error = ex.Message }); }
            catch (Exception ex) { return StatusCode(500, new { error = "Server error", detail = ex.Message }); }
        }

        [HttpPost("logout")]
        [Authorize]
        public async Task<IActionResult> Logout()
        {
            // Lấy UserID từ token
            var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier));
            await _auth.LogoutAsync(userId);

            // Xóa cả 2 cookie ở phía client
            Response.Cookies.Delete("access_token");
            Response.Cookies.Delete("refresh_token", new CookieOptions { Path = "/auth" });

            return NoContent();
        }

        [HttpGet("session")]
        [Authorize]
        public IActionResult GetSessionInfo()
        {
            var expClaim = User.FindFirstValue("exp");
            var expiresAt = DateTime.UnixEpoch; // Giá trị mặc định
            if (long.TryParse(expClaim, out long expSeconds))
            {
                expiresAt = DateTimeOffset.FromUnixTimeSeconds(expSeconds).UtcDateTime;
            }

            var info = new SessionInfo
            {
                UserID = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)),
                Email = User.FindFirstValue(ClaimTypes.Email),
                Role = User.FindFirstValue(ClaimTypes.Role),
                ExpiresAt = expiresAt
            };

            if (info.UserID == 0)
            {
                return Unauthorized();
            }

            return Ok(info);
        }
        
        [HttpPost("refresh")]
        public async Task<IActionResult> Refresh()
        {
            // Đọc Refresh Token từ cookie
            var refreshToken = Request.Cookies["refresh_token"];
            if (string.IsNullOrEmpty(refreshToken))
                return Unauthorized(new { error = "Missing refresh token." });

            try
            {
                // Gọi Service để lấy Access Token MỚI
                var res = await _auth.RefreshTokenAsync(refreshToken);

                // Cấp Access Token MỚI
                var accessCookieOptions = new CookieOptions
                {
                    HttpOnly = true,
                    Secure = false,
                    Expires = res.ExpiresAt,
                    SameSite = SameSiteMode.Lax
                };
                Response.Cookies.Append("access_token", res.Token, accessCookieOptions);

                return Ok(new { UserID = res.UserID });
            }
            catch (UnauthorizedAccessException ex)
            {
                // Xóa luôn cookie refresh nếu nó tào lao
                Response.Cookies.Delete("refresh_token");
                return Unauthorized(new { error = ex.Message });
            }
        }
    }
}
