using Microsoft.EntityFrameworkCore;
using DAT.Entity;

namespace DAT
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

        // Phần User & Restaurant
        public DbSet<UserRole> UserRoles { get; set; }
        public DbSet<User> Users { get; set; }
        public DbSet<Contact> Contacts { get; set; }
        public DbSet<Address> Addresses { get; set; }
        public DbSet<RestaurantStatus> RestaurantStatus { get; set; }
        public DbSet<Restaurant> Restaurants { get; set; }

        // Phần Food & Category
        public DbSet<Category> Categories { get; set; }
        public DbSet<FoodStatus> FoodStatus { get; set; }
        public DbSet<FoodItem> FoodItems { get; set; }

        // Phần Order & Payment
        public DbSet<OrderStatus> OrderStatus { get; set; }
        public DbSet<Order> Orders { get; set; }
        public DbSet<OrderItem> OrderItems { get; set; }
        public DbSet<PaymentTransactionStatus> PaymentTransactionStatus { get; set; }
        public DbSet<PaymentTransaction> PaymentTransactions { get; set; }

        // Phần Drone & Delivery
        public DbSet<DroneStation> DroneStations { get; set; }
        public DbSet<DroneStatus> DroneStatus { get; set; }
        public DbSet<Drone> Drones { get; set; }
        public DbSet<DeliveryStatus> DeliveryStatus { get; set; }
        public DbSet<Delivery> Deliveries { get; set; }


        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);
            // --- CẤU HÌNH BẮT BUỘC CHO KHÓA PHỨC HỢP & QUAN HỆ 1-1 ---

            // 1. Định nghĩa khóa chính PHỨC HỢP cho bảng OrderItem
            modelBuilder.Entity<OrderItem>()
                .HasKey(oi => new { oi.OrderID, oi.FoodID });

            // (Tùy chọn, nhưng nên làm rõ) Định nghĩa quan hệ M-N qua OrderItem
            modelBuilder.Entity<OrderItem>()
                .HasOne(oi => oi.Order)
                .WithMany(o => o.OrderItems)
                .HasForeignKey(oi => oi.OrderID);

            modelBuilder.Entity<OrderItem>()
                .HasOne(oi => oi.FoodItem)
                .WithMany(fi => fi.OrderItems)
                .HasForeignKey(oi => oi.FoodID);

            // 2. Định nghĩa quan hệ 1-1 cho Order và PaymentTransaction
            // (Một Order chỉ có một PaymentTransaction)
            modelBuilder.Entity<Order>()
                .HasOne(o => o.PaymentTransaction)
                .WithOne(pt => pt.Order)
                .HasForeignKey<PaymentTransaction>(pt => pt.OrderID);

            // 3. Định nghĩa quan hệ 1-1 cho Order và Delivery
            // (Một Order chỉ có một Delivery)
            modelBuilder.Entity<Order>()
                .HasOne(o => o.Delivery)
                .WithOne(d => d.Order)
                .HasForeignKey<Delivery>(d => d.OrderID);

            // ... các cấu hình Fluent API khác nếu bạn cần (ví dụ: UNIQUE index)
            // Ví dụ: Đảm bảo Email trong Contact là UNIQUE (mặc dù bạn đã có trong SQL)
            modelBuilder.Entity<Contact>()
                .HasIndex(c => c.Email)
                .IsUnique();
        }
    }
}