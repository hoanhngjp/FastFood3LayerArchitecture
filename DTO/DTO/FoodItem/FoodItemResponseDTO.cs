using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace DTO.DTO
{
    public class FoodItemResponseDTO
    {
        public int FoodId { get; set; }
        public string FoodName { get; set; }
        public string? Description { get; set; }
        public int Price { get; set; }
        public string? ImgUrl { get; set; }
        public int StatusID { get; set; }
        public string? StatusName { get; set; } // tiện để hiển thị
        public DateTime? CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }
        public int CategoryId { get; set; }
        public string? CategoryName { get; set; } // tiện để hiển thị
    }
}
