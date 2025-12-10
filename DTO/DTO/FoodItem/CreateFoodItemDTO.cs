using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace DTO.DTO.FoodItem
{
    public class CreateFoodItemDTO
    {
        [Required(ErrorMessage = "Tên món không được để trống")]
        public string FoodName { get; set; }

        public string? Description { get; set; }

        [Range(0, int.MaxValue, ErrorMessage = "Giá tiền không hợp lệ")]
        public int Price { get; set; }

        public string? ImgUrl { get; set; }

        [Required]
        public int StatusID { get; set; } // Mặc định trạng thái khi tạo

        [Required(ErrorMessage = "Phải chọn danh mục cho món ăn")]
        public int CategoryId { get; set; }
    }
}
