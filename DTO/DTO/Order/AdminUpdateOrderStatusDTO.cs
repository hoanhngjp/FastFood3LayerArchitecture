using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace DTO.DTO.Order
{
    public class AdminUpdateOrderStatusDTO
    {
        [Required]
        public int OrderID { get; set; }

        [Required]
        public int StatusID { get; set; }
    }
}
