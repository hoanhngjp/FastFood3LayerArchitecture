using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace DTO.DTO
{
    public class OrderDTO
    {
        public int OrderID { get; set; }
        public int UserID { get; set; }
        public int AdrsID { get; set; }

        public int RestaurantID { get; set; }
        public string? RestaurantName { get; set; }
        public string? RestaurantAddress { get; set; }

        public DateTime OrderTime { get; set; }

        public int StatusID { get; set; }       
        public string StatusName { get; set; } = "Pending";

        public int TotalAmount { get; set; }
        public DateTime? UpdatedAt { get; set; }

        public List<OrderItemDTO> Items { get; set; } = new();
    }

}
