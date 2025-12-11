using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace DTO.DTO
{
    public class UserDTO
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
        public int? OrderCount { get; set; }
        public string Password { get; set; }
    }
}
