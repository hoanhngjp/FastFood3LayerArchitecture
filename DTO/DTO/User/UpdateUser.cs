namespace DTO.DTO.User
{
    public class UpdateUser
    {
        public int UserID { get; set; }
        public string FullName { get; set; }
        public string Email { get; set; }
        public DateTime? DOB { get; set; }

        public int RoleID { get; set; }
        public string RoleName { get; set; }

        public string? AvatarURL { get; set; }
        public DateTime? CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }
        public string? Password { get; set; }
    }
}
