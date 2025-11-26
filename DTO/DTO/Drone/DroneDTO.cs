using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace DTO.DTO.Drone
{
    public class DroneDTO
    {
        public int DroneID { get; set; }
        public string Model { get; set; }
        public decimal? CurrentBattery { get; set; }
        public decimal? MaxLoad { get; set; }
        public decimal? CurrentLat { get; set; }
        public decimal? CurrentLng { get; set; }
        // Thông tin hiển thị thêm
        public int? StationID { get; set; }
        public string StationName { get; set; } // Lấy từ DroneStation
        public string StatusName { get; set; }  // Lấy từ DroneStatus
    }
}
