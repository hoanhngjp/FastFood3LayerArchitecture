using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace DTO.DTO.Drone
{
    public class UpdateDroneDTO
    {
        public int DroneID { get; set; }

        [Required]
        public string Model { get; set; }

        [Range(0, 100)]
        public decimal? CurrentBattery { get; set; }

        public decimal? MaxLoad { get; set; }

        public int StationID { get; set; } // Cho phép chuyển trạm

        public int StatusID { get; set; } // Admin có quyền set trạng thái (Bảo trì/Rảnh)
    }
}
