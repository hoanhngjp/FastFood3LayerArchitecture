using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace DAT.Entity
{
    [Table("Address")]
    public class Address
    {
        [Key]
        public int AdrsID { get; set; }

        [StringLength(255)]
        public string AdrsCustomerName { get; set; }

        [Required]
        [StringLength(500)]
        public string AdrsLine { get; set; }

        [Column(TypeName = "decimal(9, 6)")]
        public decimal Latitude { get; set; } // Vĩ độ

        [Column(TypeName = "decimal(9, 6)")]
        public decimal Longitude { get; set; } // Kinh độ

        [Required]
        [StringLength(20)]
        public string Phone { get; set; }

        public bool? IsDefault { get; set; }

        public int UserID { get; set; }

        // Navigation property: Mối quan hệ với User
        [ForeignKey("UserID")]
        public virtual User User { get; set; }

        // Navigation property: Một địa chỉ được dùng cho nhiều đơn hàng
        public virtual ICollection<Order> Orders { get; set; } = new List<Order>();
    }
}
