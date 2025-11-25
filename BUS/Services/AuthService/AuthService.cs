using DAT.UnitOfWork;
using Common;
using DTO.DTO;
using Microsoft.Extensions.Configuration;
using System;
using System.Collections.Generic;
using System.IdentityModel.Tokens.Jwt;
using System.Linq;
using System.Security.Claims;
using System.Text;
using System.Threading.Tasks;
using DAT.Entity; // Đảm bảo bạn đã using namespace Entity

namespace BUS.Services
{
    public class AuthService : IAuthService
    {
        private readonly IUnitOfWork _uow;
        private readonly IConfiguration _config;

        public AuthService(IUnitOfWork uow, IConfiguration config)
        {
            _uow = uow;
            _config = config;
        }

        public async Task<int> SignUpAsync(SignupRequest dto)
        {
            if (string.IsNullOrWhiteSpace(dto.FullName)
                || string.IsNullOrWhiteSpace(dto.Email)
                || string.IsNullOrWhiteSpace(dto.Password)
                || string.IsNullOrWhiteSpace(dto.Role))
                throw new ArgumentException("Missing required fields");

            var roleName = dto.Role.ToLowerInvariant();

            var roleEntity = (await _uow.UserRoles.FindAsync(r => r.RoleName == roleName)).FirstOrDefault();

            if (roleEntity == null)
                throw new ArgumentException($"Invalid role specified: {dto.Role}");

            // Kiểm tra email tồn tại
            var existing = await _uow.Users.GetByEmailAsync(dto.Email);
            if (existing != null)
                throw new InvalidOperationException("Email already exists");

            var passwordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password);

            var user = new DAT.Entity.User
            {
                FullName = dto.FullName,
                Email = dto.Email,
                PasswordHash = passwordHash,
                RoleID = roleEntity.RoleID,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
            };

            await _uow.Users.AddAsync(user);
            await _uow.SaveChangesAsync();

            return user.UserID;
        }

        public async Task<AuthResponse> LoginAsync(LoginRequest dto)
        {
            var user = await _uow.Users.GetByEmailAsync(dto.Email);
            if (user == null) throw new UnauthorizedAccessException("Invalid credentials");
            if (!BCrypt.Net.BCrypt.Verify(dto.Password, user.PasswordHash))
                throw new UnauthorizedAccessException("Invalid credentials");
            if (user.UserRole == null)
            {
                var role = await _uow.UserRoles.GetByIdAsync(user.RoleID);
                if (role == null)
                    throw new InvalidOperationException($"Critical Error: User {user.UserID} has invalid RoleID {user.RoleID}.");
                user.UserRole = role;
            }

            // Tạo Access Token
            var jwtSettings = _config.GetSection("Jwt");
            var accessToken = JwtHelper.GenerateToken(user, jwtSettings);
            var expires = JwtHelper.GetExpiryFromSettings(jwtSettings);

            // Tạo Refresh Token
            var refreshToken = JwtHelper.GenerateRefreshToken();

            // Lưu vào CSDL
            user.RefreshToken = refreshToken;
            user.RefreshTokenExpiry = DateTime.UtcNow.AddDays(7); // Hạn 7 ngày

            _uow.Users.Update(user);
            await _uow.SaveChangesAsync();

            // Trả về cho Controller
            return new AuthResponse
            {
                UserID = user.UserID,
                Token = accessToken,
                ExpiresAt = expires,
                RefreshToken = refreshToken
            };
        }

        public async Task LogoutAsync(int userId)
        {
            var user = await _uow.Users.GetByIdAsync(userId);
            if (user == null) return;

            user.RefreshToken = null;
            user.RefreshTokenExpiry = null;

            _uow.Users.Update(user);
            await _uow.SaveChangesAsync();
        }

        public async Task<AuthResponse> RefreshTokenAsync(string refreshToken)
        {
            if (string.IsNullOrWhiteSpace(refreshToken))
                throw new UnauthorizedAccessException("Invalid refresh token.");

            var user = (await _uow.Users
                .FindAsync(u => u.RefreshToken == refreshToken))
                .FirstOrDefault();

            if (user == null)
                throw new UnauthorizedAccessException("Invalid refresh token.");

            if (user.RefreshTokenExpiry == null || user.RefreshTokenExpiry <= DateTime.UtcNow)
                throw new UnauthorizedAccessException("Refresh token expired.");

            if (user.UserRole == null)
            {
                var role = await _uow.UserRoles.GetByIdAsync(user.RoleID);
                user.UserRole = role;
            }

            // Tạo Access Token MỚI
            var jwtSettings = _config.GetSection("Jwt");
            var newAccessToken = JwtHelper.GenerateToken(user, jwtSettings);
            var newExpires = JwtHelper.GetExpiryFromSettings(jwtSettings);

            // Trả Access Token MỚI
            return new AuthResponse
            {
                UserID = user.UserID,
                Token = newAccessToken,
                ExpiresAt = newExpires,
                RefreshToken = null
            };
        }
    }
}