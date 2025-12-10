namespace DTO.DTO.User
{
    public class CreateUser
    {
        public string FullName { get; set; }
        public string Email { get; set; }
        public DateTime? DOB { get; set; }

        public int RoleID { get; set; }
        public string RoleName { get; set; }

        public string? AvatarURL { get; set; }
        public DateTime? CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }

        // THÊM: Dùng cho AddUserAsync (thay vì lưu "123456")
        public string Password { get; set; }
    }
}
