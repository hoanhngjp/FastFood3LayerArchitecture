using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace DTO.DTO.Order
{
    public class CheckoutRequestDTO
    {
        public int AdrsID { get; set; }
        public int RestaurantID { get; set; }
        // public string? Note { get; set; } // Ghi chú đơn hàng (nếu cần)
    }
}
