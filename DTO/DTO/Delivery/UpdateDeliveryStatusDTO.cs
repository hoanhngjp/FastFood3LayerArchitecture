using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace DTO.DTO.Delivery
{
    public class UpdateDeliveryStatusDTO
    {
        [Required]
        public int DeliveryID { get; set; }

        [Required]
        public int StatusID { get; set; }
    }
}
