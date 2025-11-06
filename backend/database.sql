-- ======================================================
-- DATABASE CREATION
-- ======================================================

-- ======================================================
-- TABLE: Roles
-- ======================================================
CREATE TABLE Roles (
    RoleID INT IDENTITY(1,1) PRIMARY KEY,
    RoleName NVARCHAR(50) UNIQUE NOT NULL,  -- e.g. 'Admin', 'Landlord', 'Tenant'
    Description NVARCHAR(255)
);
GO

-- ======================================================
-- TABLE: Users
-- ======================================================
CREATE TABLE Users (
    UserID INT IDENTITY(1,1) PRIMARY KEY,
    RoleID INT NULL,  -- Assigned later after creation
    Name NVARCHAR(100) NOT NULL,
    Email NVARCHAR(150) NOT NULL UNIQUE,
    PasswordHash NVARCHAR(255) NOT NULL,
    Phone NVARCHAR(20),
    CreatedAt DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (RoleID) REFERENCES Roles(RoleID)
);
GO

-- ======================================================
-- TABLE: PropertyTypes
-- ======================================================
CREATE TABLE PropertyTypes (
    PropertyTypeID INT IDENTITY(1,1) PRIMARY KEY,
    TypeName NVARCHAR(50) NOT NULL,  -- e.g., 'Farm House', 'Shop/Office', 'Flat'
    Description NVARCHAR(255)
);
GO

-- ======================================================
-- TABLE: Properties
-- ======================================================
CREATE TABLE Properties (
    PropertyID INT IDENTITY(1,1) PRIMARY KEY,
    LandlordID INT NOT NULL,
    PropertyTypeID INT NOT NULL,
    Title NVARCHAR(150),
    Address NVARCHAR(255) NOT NULL,
    City NVARCHAR(100),
    BaseRentAmount DECIMAL(12,2),
    Description NVARCHAR(MAX),
    Status NVARCHAR(20) CHECK (Status IN ('Vacant', 'Occupied')) DEFAULT 'Vacant',
    CreatedAt DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (LandlordID) REFERENCES Users(UserID),
    FOREIGN KEY (PropertyTypeID) REFERENCES PropertyTypes(PropertyTypeID)
);
GO

-- ======================================================
-- TABLE: FarmHouseDetails
-- ======================================================
CREATE TABLE FarmHouseDetails (
    PropertyID INT PRIMARY KEY,
    LandArea DECIMAL(12,2),
    HasPool BIT DEFAULT 0,
    HasGarden BIT DEFAULT 0,
    FOREIGN KEY (PropertyID) REFERENCES Properties(PropertyID)
);
GO

-- ======================================================
-- TABLE: ShopOfficeDetails
-- ======================================================
CREATE TABLE ShopOfficeDetails (
    PropertyID INT PRIMARY KEY,
    FloorNumber INT,
    AreaSqFt DECIMAL(10,2),
    CommercialLicenseNo NVARCHAR(100),
    FOREIGN KEY (PropertyID) REFERENCES Properties(PropertyID)
);
GO

-- ======================================================
-- TABLE: FlatDetails
-- ======================================================
CREATE TABLE FlatDetails (
    PropertyID INT PRIMARY KEY,
    FlatNumber NVARCHAR(50),
    BuildingName NVARCHAR(150),
    FloorNumber INT,
    AreaSqFt DECIMAL(10,2),
    FOREIGN KEY (PropertyID) REFERENCES Properties(PropertyID)
);
GO

-- ======================================================
-- TABLE: LeaseAgreements
-- ======================================================
CREATE TABLE LeaseAgreements (
    LeaseID INT IDENTITY(1,1) PRIMARY KEY,
    PropertyID INT NOT NULL,
    TenantID INT NOT NULL,
    StartDate DATE NOT NULL,
    EndDate DATE,
    DepositAmount DECIMAL(12,2),
    MonthlyRent DECIMAL(12,2) NOT NULL,
    AgreementType NVARCHAR(20) CHECK (AgreementType IN ('Lease', 'Rent')),
    Terms NVARCHAR(MAX),
    Status NVARCHAR(20) CHECK (Status IN ('Active', 'Terminated', 'Pending')) DEFAULT 'Pending',
    CreatedAt DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (PropertyID) REFERENCES Properties(PropertyID),
    FOREIGN KEY (TenantID) REFERENCES Users(UserID)
);
GO

-- ======================================================
-- TABLE: Payments
-- ======================================================
CREATE TABLE Payments (
    PaymentID INT IDENTITY(1,1) PRIMARY KEY,
    LeaseID INT NOT NULL,
    PaymentDate DATETIME DEFAULT GETDATE(),
    Amount DECIMAL(12,2) NOT NULL,
    PaymentMethod NVARCHAR(50),
    PaymentStatus NVARCHAR(20) CHECK (PaymentStatus IN ('Paid', 'Pending')) DEFAULT 'Pending',
    InvoiceNumber NVARCHAR(100),
    Notes NVARCHAR(255),
    FOREIGN KEY (LeaseID) REFERENCES LeaseAgreements(LeaseID)
);
GO

-- ======================================================
-- TABLE: Documents
-- ======================================================
CREATE TABLE Documents (
    DocumentID INT IDENTITY(1,1) PRIMARY KEY,
    LeaseID INT NOT NULL,
    FilePath NVARCHAR(255) NOT NULL,
    FileType NVARCHAR(50),
    UploadedAt DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (LeaseID) REFERENCES LeaseAgreements(LeaseID)
);
GO

-- ======================================================
-- TABLE: MaintenanceRequests
-- ======================================================
CREATE TABLE MaintenanceRequests (
    RequestID INT IDENTITY(1,1) PRIMARY KEY,
    PropertyID INT NOT NULL,
    TenantID INT NOT NULL,
    Description NVARCHAR(MAX),
    Status NVARCHAR(20) CHECK (Status IN ('Pending', 'In Progress', 'Completed')) DEFAULT 'Pending',
    CreatedAt DATETIME DEFAULT GETDATE(),
    ResolvedAt DATETIME NULL,
    FOREIGN KEY (PropertyID) REFERENCES Properties(PropertyID),
    FOREIGN KEY (TenantID) REFERENCES Users(UserID)
);
GO

-- ======================================================
-- TABLE: Notifications
-- ======================================================
CREATE TABLE Notifications (
    NotificationID INT IDENTITY(1,1) PRIMARY KEY,
    UserID INT NOT NULL,
    Type NVARCHAR(50),
    Message NVARCHAR(255),
    IsRead BIT DEFAULT 0,
    CreatedAt DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (UserID) REFERENCES Users(UserID)
);
GO

-- ======================================================
-- CREATE INDEXES FOR BETTER PERFORMANCE
-- ======================================================
CREATE INDEX IDX_Users_Email ON Users(Email);
CREATE INDEX IDX_Users_RoleID ON Users(RoleID);
CREATE INDEX IDX_Properties_LandlordID ON Properties(LandlordID);
CREATE INDEX IDX_Properties_PropertyTypeID ON Properties(PropertyTypeID);
CREATE INDEX IDX_LeaseAgreements_PropertyID ON LeaseAgreements(PropertyID);
CREATE INDEX IDX_LeaseAgreements_TenantID ON LeaseAgreements(TenantID);
CREATE INDEX IDX_LeaseAgreements_Status ON LeaseAgreements(Status);
CREATE INDEX IDX_Payments_LeaseID ON Payments(LeaseID);
CREATE INDEX IDX_Payments_PaymentStatus ON Payments(PaymentStatus);
CREATE INDEX IDX_Documents_LeaseID ON Documents(LeaseID);
CREATE INDEX IDX_MaintenanceRequests_PropertyID ON MaintenanceRequests(PropertyID);
CREATE INDEX IDX_MaintenanceRequests_TenantID ON MaintenanceRequests(TenantID);
CREATE INDEX IDX_MaintenanceRequests_Status ON MaintenanceRequests(Status);
CREATE INDEX IDX_Notifications_UserID ON Notifications(UserID);
CREATE INDEX IDX_Notifications_IsRead ON Notifications(IsRead);
