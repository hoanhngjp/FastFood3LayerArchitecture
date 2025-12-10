using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace DTO.DTO.Payment
{
    public class PaymentTransactionDTO
    {
        public int TransactionID { get; set; }
        public string TransactionNo { get; set; } // vnp_TransactionNo

        public int OrderID { get; set; }
        public string CustomerName { get; set; } // Lấy từ Order.User

        public int Amount { get; set; }
        public string BankCode { get; set; }
        public string OrderInfo { get; set; }
        public DateTime? PaymentDate { get; set; }

        public int StatusID { get; set; }
        public string StatusName { get; set; }
    }
}
