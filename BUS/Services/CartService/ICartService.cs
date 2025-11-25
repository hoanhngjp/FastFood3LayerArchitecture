using DTO.DTO.Cart;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace BUS.Services.CartService
{
    public interface ICartService
    {
        Task<List<CartItemDTO>> GetCartAsync();
        Task AddToCartAsync(int foodId, int quantity);
        Task UpdateQuantityAsync(int foodId, int quantity);
        Task RemoveFromCartAsync(int foodId);

        Task ClearCartAsync();
    }    
}
