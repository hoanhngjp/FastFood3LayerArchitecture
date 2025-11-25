using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace DTO.DTO.Cart
{
    public class CartItemDTO
    {
        public int FoodID { get; set; }
        public string FoodName { get; set; }
        public string ImageURL { get; set; }
        public int Price { get; set; }
        public int Quantity { get; set; }

        // Tính toán tổng tiền của item này (tránh tràn số dùng long)
        public long TotalPrice => (long)Price * Quantity;
    }
}
