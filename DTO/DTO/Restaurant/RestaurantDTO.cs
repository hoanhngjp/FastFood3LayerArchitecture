using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace DTO.DTO
{
    public class RestaurantDTO
    {
        public int RestaurantID { get; set; }
        public int ManagerID { get; set; }
        public string Name { get; set; }
        public string Address { get; set; }
        public string PhoneNumber { get; set; }
        public string OpeningHours { get; set; }
        public decimal? Location_Lat { get; set; }
        public decimal? Location_Lng { get; set; }
        public int StatusID { get; set; }
        public string StatusName { get; set; }
    }
}
