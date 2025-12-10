using DTO.DTO.Payment;
using Microsoft.AspNetCore.Http;
using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Net;
using System.Net.Sockets;
using System.Security.Cryptography;
using System.Text;

namespace Common
{
    public class VnPayLibrary
    {
        private readonly SortedList<string, string> _requestData = new SortedList<string, string>(StringComparer.Ordinal);
        private readonly SortedList<string, string> _responseData = new SortedList<string, string>(StringComparer.Ordinal);

        public void AddRequestData(string key, string value)
        {
            if (!string.IsNullOrEmpty(value))
            {
                _requestData.Add(key, value);
            }
        }

        public void AddResponseData(string key, string value)
        {
            if (!string.IsNullOrEmpty(value))
            {
                _responseData.Add(key, value);
            }
        }

        public string GetResponseData(string key)
        {
            return _responseData.TryGetValue(key, out var retValue) ? retValue : string.Empty;
        }

        public string CreateRequestUrl(string baseUrl, string vnpHashSecret)
        {
            var data = new StringBuilder();

            // Dùng StringComparer.Ordinal để đảm bảo thứ tự sắp xếp chuẩn ASCII
            // (Bỏ VnPayCompare cũ đi để tránh rủi ro logic so sánh sai)
            var sortedData = new SortedList<string, string>(_requestData, StringComparer.Ordinal);

            foreach (var (key, value) in sortedData.Where(kv => !string.IsNullOrEmpty(kv.Value)))
            {
                // Dùng Uri.EscapeDataString theo chuẩn mới
                data.Append(WebUtility.UrlEncode(key) + "=" + WebUtility.UrlEncode(value) + "&");
            }

            var querystring = data.ToString();
            baseUrl += "?" + querystring;

            var signData = querystring;
            if (signData.Length > 0)
            {
                signData = signData.Remove(querystring.Length - 1, 1);
            }

            // --- ĐOẠN LOG DEBUG QUAN TRỌNG ---
            Console.ForegroundColor = ConsoleColor.Yellow;
            Console.WriteLine("================ VNPAY DEBUG ================");
            Console.WriteLine("1. RAW DATA (Chuỗi dùng để Hash):");
            Console.WriteLine(signData);
            Console.WriteLine("---------------------------------------------");
            // Bạn hãy copy chuỗi signData in ra ở trên, 
            // Vào trang: https://www.freeformatter.com/hmac-generator.html
            // Dán vào ô Input, chọn SHA512, điền SecretKey -> So sánh kết quả Hash

            var vnpSecureHash = HmacSha512(vnpHashSecret, signData);

            Console.WriteLine("2. HASH TÍNH ĐƯỢC (Trong Code):");
            Console.WriteLine(vnpSecureHash);
            Console.WriteLine("=============================================");
            Console.ResetColor();
            // ---------------------------------

            baseUrl += "vnp_SecureHash=" + vnpSecureHash;

            return baseUrl;
        }
        public bool ValidateSignature(string inputHash, string secretKey)
        {
            var rspRaw = GetResponseDataForHash();
            var myChecksum = HmacSha512(secretKey, rspRaw);
            return myChecksum.Equals(inputHash, StringComparison.InvariantCultureIgnoreCase);
        }

        private string HmacSha512(string key, string inputData)
        {
            var hash = new StringBuilder();
            var keyBytes = Encoding.UTF8.GetBytes(key);
            var inputBytes = Encoding.UTF8.GetBytes(inputData);
            using (var hmac = new HMACSHA512(keyBytes))
            {
                var hashValue = hmac.ComputeHash(inputBytes);
                foreach (var theByte in hashValue)
                {
                    hash.Append(theByte.ToString("x2"));
                }
            }
            return hash.ToString();
        }

        public string GetIpAddress(HttpContext context)
        {
            var ipAddress = string.Empty;
            try
            {
                var remoteIpAddress = context.Connection.RemoteIpAddress;
                if (remoteIpAddress != null)
                {
                    if (remoteIpAddress.AddressFamily == AddressFamily.InterNetworkV6)
                    {
                        remoteIpAddress = Dns.GetHostEntry(remoteIpAddress).AddressList
                            .FirstOrDefault(x => x.AddressFamily == AddressFamily.InterNetwork);
                    }
                    if (remoteIpAddress != null) ipAddress = remoteIpAddress.ToString();
                    return ipAddress;
                }
            }
            catch (Exception) { /* Bỏ qua */ }
            return "127.0.0.1";
        }

        private string GetResponseDataForHash()
        {
            var data = new StringBuilder();
            if (_responseData.ContainsKey("vnp_SecureHashType"))
            {
                _responseData.Remove("vnp_SecureHashType");
            }
            if (_responseData.ContainsKey("vnp_SecureHash"))
            {
                _responseData.Remove("vnp_SecureHash");
            }
            foreach (var (key, value) in _responseData.Where(kv => !string.IsNullOrEmpty(kv.Value)))
            {
                // THAY ĐỔI QUAN TRỌNG: Dùng Uri.EscapeDataString
                data.Append(WebUtility.UrlEncode(key) + "=" + WebUtility.UrlEncode(value) + "&");
            }
            if (data.Length > 0)
            {
                data.Remove(data.Length - 1, 1);
            }
            return data.ToString();
        }

        public PaymentResponseModel GetFullResponseData(IQueryCollection collection, string hashSecret)
        {
            // 1. "Nhồi" data
            foreach (var (key, value) in collection)
            {
                if (!string.IsNullOrEmpty(key) && key.StartsWith("vnp_"))
                {
                    AddResponseData(key, value);
                }
            }

            // 2. Lấy các thông số
            var orderId = GetResponseData("vnp_TxnRef");
            var vnPayTranId = GetResponseData("vnp_TransactionNo");
            var vnpResponseCode = GetResponseData("vnp_ResponseCode");
            var vnpSecureHash = collection.FirstOrDefault(k => k.Key == "vnp_SecureHash").Value;
            var orderInfo = GetResponseData("vnp_OrderInfo");

            // 3. "Soi" chữ ký
            var checkSignature = ValidateSignature(vnpSecureHash, hashSecret);

            if (!checkSignature)
            {
                return new PaymentResponseModel()
                {
                    Success = false,
                    VnPayResponseCode = "97" // Mã 97 = Checksum không hợp lệ
                };
            }

            // 4. Nếu chữ ký OK, trả về "báo cáo"
            return new PaymentResponseModel()
            {
                Success = true,
                PaymentMethod = "VnPay",
                OrderDescription = orderInfo,
                OrderId = orderId,
                PaymentId = vnPayTranId,
                TransactionId = vnPayTranId,
                Token = vnpSecureHash,
                VnPayResponseCode = vnpResponseCode
            };
        }
    }
}