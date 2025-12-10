using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace DAT.Entity
{
    [Table("FoodItem")]
    public class FoodItem
    {
        [Key]
        public int FoodID { get; set; }

        public int CategoryID { get; set; }

        [Required]
        [StringLength(255)]
        public string FoodName { get; set; }

        [Required]
        public int Price { get; set; }

        [StringLength(512)]
        public string? ImageURL { get; set; }
        [StringLength(1000)]
        public string? Description { get; set; }

        public int StatusID { get; set; }

        public DateTime? CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }

        // Navigation property
        [ForeignKey("CategoryID")]
        public virtual Category Category { get; set; }

        // Navigation property
        [ForeignKey("StatusID")]
        public virtual FoodStatus FoodStatus { get; set; }

        // Navigation property (cho quan hệ Many-to-Many)
        public virtual ICollection<OrderItem> OrderItems { get; set; } = new List<OrderItem>();
    }
}
