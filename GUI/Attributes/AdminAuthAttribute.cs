using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;

namespace GUI.Attributes
{
    public class AdminAuthAttribute : ActionFilterAttribute
    {
        public override void OnActionExecuting(ActionExecutingContext context)
        {
            // 1. Lấy token từ Cookie
            var token = context.HttpContext.Request.Cookies["access_token"];

            if (string.IsNullOrEmpty(token))
            {
                // Chưa đăng nhập -> Chuyển về trang Login
                context.Result = new RedirectToActionResult("Login", "Home", new { area = "" });
                return;
            }

            try
            {
                // 2. Giải mã Token để lấy Role (Không cần validate signature ở đây vì WebAPI đã làm, chỉ cần đọc payload)
                var handler = new JwtSecurityTokenHandler();
                var jwtToken = handler.ReadJwtToken(token);

                // Lấy claim "role"
                // Lưu ý: Tên claim trong JWT chuẩn thường là "role" hoặc "http://schemas.microsoft.com/ws/2008/06/identity/claims/role"
                var roleClaim = jwtToken.Claims.FirstOrDefault(c => c.Type == "role" || c.Type == ClaimTypes.Role);

                if (roleClaim == null || roleClaim.Value.ToLower() != "admin")
                {
                    // 3. Có đăng nhập nhưng KHÔNG PHẢI ADMIN -> Chuyển về trang chủ hoặc trang lỗi
                    context.Result = new RedirectToActionResult("Index", "Home", new { area = "" });
                    return;
                }

                // Nếu là Admin -> Cho phép tiếp tục vào Action
            }
            catch
            {
                // Token lỗi -> coi như chưa đăng nhập
                context.Result = new RedirectToActionResult("Login", "Home", new { area = "" });
            }

            base.OnActionExecuting(context);
        }
    }
}
