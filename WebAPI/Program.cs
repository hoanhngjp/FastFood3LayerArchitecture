using BUS.Services;
using BUS.Services.AddressService;
using BUS.Services.CartService;
using BUS.Services.DashboardService;
using BUS.Services.DeliveryService;
using BUS.Services.DroneService;
using BUS.Services.DroneStationService;
using BUS.Services.FileStorageService;
using BUS.Services.PaymentService;
using BUS.Services.RestaurantService;
using DAT;
using DAT.Repository;
using DAT.UnitOfWork;
using DotNetEnv;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using WebAPI.Workers;

DotNetEnv.Env.Load();

var builder = WebApplication.CreateBuilder(args);

// --- 1. Load Cấu hình ---
builder.Configuration["ConnectionStrings:DefaultConnection"] = Environment.GetEnvironmentVariable("DB_CONNECTION_STRING");
builder.Configuration["Jwt:Key"] = Environment.GetEnvironmentVariable("JWT_SECRET");
builder.Configuration["Vnpay:TmnCode"] = Environment.GetEnvironmentVariable("VNPAY_TMNCODE");
builder.Configuration["Vnpay:HashSecret"] = Environment.GetEnvironmentVariable("VNPAY_HASHSECRET")?.Trim();
builder.Configuration["Vnpay:BaseUrl"] = Environment.GetEnvironmentVariable("VNPAY_URL");
builder.Configuration["Vnpay:PaymentBackReturnUrl"] = Environment.GetEnvironmentVariable("VNPAY_RETURN_URL");

var config = builder.Configuration;

// --- 2. Add Services ---
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddHostedService<DroneSimulatorWorker>();

// QUAN TRỌNG: Cấu hình CORS mở toàn bộ
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.SetIsOriginAllowed(origin => true) // Cho phép mọi Origin (IP nào cũng được)
              .AllowCredentials()                 // QUAN TRỌNG: Cho phép nhận Cookie
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

// QUAN TRỌNG: Cấu hình Cookie Policy cho HTTP
// Giúp trình duyệt chấp nhận Cookie khi không có HTTPS
builder.Services.Configure<CookiePolicyOptions>(options =>
{
    options.CheckConsentNeeded = context => false;
    options.MinimumSameSitePolicy = SameSiteMode.Lax; // Lax hoạt động tốt với HTTP
    options.Secure = CookieSecurePolicy.SameAsRequest; // Nếu request là HTTP thì Cookie cũng là HTTP
});

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

builder.Services.AddDistributedMemoryCache();

// Cấu hình Session
builder.Services.AddSession(options =>
{
    options.IdleTimeout = TimeSpan.FromMinutes(30);
    options.Cookie.HttpOnly = true;
    options.Cookie.IsEssential = true;
    // Quan trọng: Để False hoặc SameAsRequest khi chạy HTTP
    options.Cookie.SecurePolicy = CookieSecurePolicy.SameAsRequest;
});

builder.Services.AddHttpContextAccessor();

// --- 3. Đăng ký Services (Dependency Injection) ---
builder.Services.AddScoped(typeof(IGenericRepository<>), typeof(GenericRepository<>));
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IUnitOfWork, UnitOfWork>();
builder.Services.AddScoped<IUserRepository, UserRepository>();
builder.Services.AddScoped<IUserService, UserService>();
builder.Services.AddScoped<ICategoryService, CategoryService>();
builder.Services.AddScoped<IFoodItemService, FoodItemService>();
builder.Services.AddScoped<IOrderService, OrderService>();
builder.Services.AddScoped<IRestaurantService, RestaurantService>();
builder.Services.AddScoped<IAddressService, AddressService>();
builder.Services.AddScoped<IVnPayService, VnPayService>();
builder.Services.AddScoped<IRestaurantDashboardService, RestaurantDashboardService>();
builder.Services.AddScoped<ICartService, CartService>();
builder.Services.AddScoped<IDroneService, DroneService>();
builder.Services.AddScoped<ISystemDashboardService, SystemDashboardService>();
builder.Services.AddScoped<IFileStorageService, FileStorageService>();
builder.Services.AddScoped<IDroneStationService, DroneStationService>();
builder.Services.AddScoped<IDeliveryService, DeliveryService>();
builder.Services.AddScoped<IPaymentService, PaymentService>();



// --- 4. Cấu hình JWT ---
builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(config["Jwt:Key"])),

        // Tắt check Issuer/Audience để tránh lỗi khi đổi từ localhost sang IP
        ValidateIssuer = false,
        ValidateAudience = false,

        ClockSkew = TimeSpan.Zero
    };

    options.Events = new JwtBearerEvents
    {
        OnMessageReceived = context =>
        {
            // Lấy token từ Cookie "access_token"
            var token = context.Request.Cookies["access_token"];
            if (!string.IsNullOrEmpty(token))
            {
                context.Token = token;
            }
            return Task.CompletedTask;
        }
    };
});

builder.Services.AddAuthorization();

var app = builder.Build();

// --- 5. Configure Pipeline (Middleware) ---

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// ❌ COMMENT DÒNG NÀY: Để không ép chuyển sang HTTPS
// app.UseHttpsRedirection(); 

// ❌ COMMENT DÒNG NÀY: HSTS ép trình duyệt ghi nhớ HTTPS -> Gây lỗi trên LAN HTTP
// app.UseHsts(); 

app.UseStaticFiles();

// Kích hoạt Cookie Policy (Đặt trước Authentication)
app.UseCookiePolicy();

// Kích hoạt CORS (Đặt trước Auth)
app.UseCors("AllowAll");

app.UseAuthentication();
app.UseAuthorization();

app.UseSession();

app.MapControllers();

app.Run();