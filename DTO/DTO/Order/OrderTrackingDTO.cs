using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace DTO.DTO.Order
{
    public class OrderTrackingDTO
    {
        public int OrderId { get; set; }
        public string StatusName { get; set; }
        public string Message { get; set; }

        // Thông tin Drone
        public string DroneModel { get; set; }
        public decimal DroneBattery { get; set; }
        public decimal CurrentDroneLat { get; set; }
        public decimal CurrentDroneLng { get; set; }

        // Point A: DroneStation
        public decimal StationLat { get; set; }
        public decimal StationLng { get; set; }
        // Point B: Restaurant (Điểm lấy hàng)
        public decimal RestaurantLat { get; set; }
        public decimal RestaurantLng { get; set; }

        // Point C: Customer Address (Điểm giao hàng)
        public decimal DestLat { get; set; }
        public decimal DestLng { get; set; }

        // Thông báo trạng thái (Popup/Notify)
        public string NotificationMessage { get; set; }
        public bool ShowPopup { get; set; } // True nếu vừa đến nhà hàng
    }
}
