using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace DTO.DTO.Drone
{
    public class UpdateStationDTO
    {
        public int StationID { get; set; }
        public string Name { get; set; }
        public string Address { get; set; }
        public decimal? Location_Lat { get; set; }
        public decimal? Location_Lng { get; set; }
    }
}
