using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace DTO.DTO.Restaurant
{
    public class CreateRestaurantDTO
    {
        [Required(ErrorMessage = "Tên nhà hàng là bắt buộc")]
        public string Name { get; set; }

        [Required(ErrorMessage = "Phải gán quản lý cho nhà hàng")]
        public int ManagerID { get; set; }

        [Required(ErrorMessage = "Địa chỉ là bắt buộc")]
        public string Address { get; set; }

        [Phone(ErrorMessage = "Số điện thoại không hợp lệ")]
        public string PhoneNumber { get; set; }
        public string? OpeningHours { get; set; }
        // Admin có thể set tọa độ luôn nếu muốn
        public decimal? Location_Lat { get; set; }
        public decimal? Location_Lng { get; set; }
    }
}
