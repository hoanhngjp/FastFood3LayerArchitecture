using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace DTO.DTO.Drone
{
    public class CreateDroneDTO
    {
        [Required]
        public string Model { get; set; }

        [Range(0, 100)]
        public decimal? CurrentBattery { get; set; }

        public decimal? MaxLoad { get; set; }

        public int StationID { get; set; }
    }
}
