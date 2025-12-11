using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace DAT.Entity
{
    [Table("User")]
    public class User
    {
        [Key]
        public int UserID { get; set; }

        [StringLength(255)]
        public string FullName { get; set; }

        [Required]
        [StringLength(255)]
        public string Email { get; set; }

        [Required]
        [StringLength(255)]
        public string PasswordHash { get; set; }

        public DateTime? DOB { get; set; }

        public int RoleID { get; set; }

        [StringLength(512)]
        public string? AvatarURL { get; set; }

        [StringLength(256)]
        public string? RefreshToken { get; set; }
        public DateTime? RefreshTokenExpiry { get; set; }
        public int? OrderCount { get; set; }
        public DateTime? CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }

        [ForeignKey("RoleID")]
        public virtual UserRole UserRole { get; set; }

        // Một người dùng có nhiều địa chỉ
        public virtual ICollection<Address> Addresses { get; set; } = new List<Address>();

        // Một Manager (User) quản lý nhiều nhà hàng
        public virtual ICollection<Restaurant> Restaurants { get; set; } = new List<Restaurant>();

        // Một người dùng có nhiều đơn hàng
        public virtual ICollection<Order> Orders { get; set; } = new List<Order>();
    }
}
