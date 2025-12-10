using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace DTO.DTO.FoodItem
{
    public class UpdateFoodItemDTO
    {
        public int FoodId { get; set; } // Để kiểm tra khớp ID

        [Required]
        public string FoodName { get; set; }
        public string? Description { get; set; }

        [Range(0, int.MaxValue)]
        public int Price { get; set; }

        public string? ImgUrl { get; set; }
        public int StatusID { get; set; }
        public int CategoryId { get; set; }
    }
}
