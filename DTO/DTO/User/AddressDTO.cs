using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace DTO.DTO
{
    public class AddressDTO
    {
        public int AdrsID { get; set; } // Chỉ dùng để trả ra

        [Required(ErrorMessage = "Tên người nhận không được để trống")]
        [StringLength(255)]
        public string AdrsCustomerName { get; set; }

        [Required(ErrorMessage = "Địa chỉ không được để trống")]
        [StringLength(500)]
        public string AdrsLine { get; set; }

        [Required(ErrorMessage = "Số điện thoại không được để trống")]
        [StringLength(20)]
        public string Phone { get; set; }

        public bool IsDefault { get; set; }
        public decimal? Latitude { get; set; } // Có thể null nếu chưa geocode
        public decimal? Longitude { get; set; } // Có thể null nếu chưa geocode
    }
}
