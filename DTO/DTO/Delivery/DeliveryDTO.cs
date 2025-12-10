using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace DTO.DTO.Delivery
{
    public class DeliveryDTO
    {
        public int DeliveryID { get; set; }

        // Thông tin Order
        public int OrderID { get; set; }
        public string CustomerName { get; set; } // Lấy từ Order.User hoặc Address

        // Thông tin Drone
        public int DroneID { get; set; }
        public string DroneModel { get; set; }

        // Thời gian
        public DateTime? PickupTime { get; set; } // Thực tế
        public DateTime? DropoffTime { get; set; } // Thực tế
        public DateTime? EstimatedPickup { get; set; }
        public DateTime? EstimatedDropoff { get; set; }

        // Trạng thái
        public int StatusID { get; set; }
        public string StatusName { get; set; }
    }
}
