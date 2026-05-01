package database

import (
	"log"
	"time"

	"github.com/lomilomi/backend/internal/models"
	"golang.org/x/crypto/bcrypt"
)

// Seed inserts demo data if the database is empty (no products exist).
// Safe to call on every startup — skips if data already present.
func Seed() {
	var count int64
	DB.Model(&models.Product{}).Count(&count)
	if count > 0 {
		log.Println("Seed: data already present, skipping")
		return
	}
	log.Println("Seed: inserting demo data...")

	now := time.Now()
	hash, _ := bcrypt.GenerateFromPassword([]byte("Demo1234!"), bcrypt.DefaultCost)
	pw := string(hash)

	// ── Users ───────────────────────────────────────────────
	bd1 := time.Date(1995, 3, 15, 0, 0, 0, 0, time.UTC)
	bd2 := time.Date(1992, 7, 22, 0, 0, 0, 0, time.UTC)
	bd3 := time.Date(1998, 11, 5, 0, 0, 0, 0, time.UTC)
	bd4 := time.Date(1990, 1, 10, 0, 0, 0, 0, time.UTC)
	bd5 := time.Date(1996, 6, 28, 0, 0, 0, 0, time.UTC)

	users := []models.User{
		{Username: "sophie_paris", Email: "sophie@demo.com", Phone: "+33612345001", Password: pw, Bio: "Passionnée de yoga et de voyages 🧘‍♀️✈️", Gender: "female", LookingFor: "male", BirthDate: &bd1, City: "Paris", Latitude: 48.8566, Longitude: 2.3522, IsVerified: true, Role: "user"},
		{Username: "marc_lyon", Email: "marc@demo.com", Phone: "+33612345002", Password: pw, Bio: "Chef cuisinier, amateur de bons vins 🍷", Gender: "male", LookingFor: "female", BirthDate: &bd2, City: "Lyon", Latitude: 45.7640, Longitude: 4.8357, IsVerified: true, Role: "user"},
		{Username: "amina_marseille", Email: "amina@demo.com", Phone: "+33612345003", Password: pw, Bio: "Danseuse et prof de fitness 💃", Gender: "female", LookingFor: "male", BirthDate: &bd3, City: "Marseille", Latitude: 43.2965, Longitude: 5.3698, IsVerified: true, Role: "user"},
		{Username: "thomas_owner", Email: "thomas@demo.com", Phone: "+33612345004", Password: pw, Bio: "Entrepreneur dans le bien-être", Gender: "male", LookingFor: "female", BirthDate: &bd4, City: "Paris", Latitude: 48.8700, Longitude: 2.3400, IsVerified: true, Role: "owner"},
		{Username: "fatou_dakar", Email: "fatou@demo.com", Phone: "+221771234567", Password: pw, Bio: "Artiste et créatrice de bijoux ✨", Gender: "female", LookingFor: "male", BirthDate: &bd5, City: "Dakar", Latitude: 14.6928, Longitude: -17.4467, IsVerified: true, Role: "user"},
	}
	DB.Create(&users)
	log.Printf("Seed: created %d users", len(users))

	// ── Photos ──────────────────────────────────────────────
	photos := []models.Photo{
		{UserID: users[0].ID, URL: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400", Position: 0},
		{UserID: users[0].ID, URL: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400", Position: 1},
		{UserID: users[1].ID, URL: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400", Position: 0},
		{UserID: users[2].ID, URL: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400", Position: 0},
		{UserID: users[3].ID, URL: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400", Position: 0},
		{UserID: users[4].ID, URL: "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=400", Position: 0},
	}
	DB.Create(&photos)

	// ── User Preferences ────────────────────────────────────
	prefs := []models.UserPreference{
		{UserID: users[0].ID, MinAge: 25, MaxAge: 40, MaxDistance: 50, Gender: "male", Interests: `["yoga","travel","cooking"]`},
		{UserID: users[1].ID, MinAge: 22, MaxAge: 38, MaxDistance: 30, Gender: "female", Interests: `["wine","cooking","cinema"]`},
		{UserID: users[2].ID, MinAge: 23, MaxAge: 35, MaxDistance: 40, Gender: "male", Interests: `["dance","fitness","music"]`},
		{UserID: users[4].ID, MinAge: 24, MaxAge: 40, MaxDistance: 100, Gender: "male", Interests: `["art","jewelry","travel"]`},
	}
	DB.Create(&prefs)

	// ── Likes & Matches ─────────────────────────────────────
	likes := []models.Like{
		{LikerID: users[0].ID, LikedID: users[1].ID},
		{LikerID: users[1].ID, LikedID: users[0].ID},
		{LikerID: users[2].ID, LikedID: users[1].ID},
		{LikerID: users[4].ID, LikedID: users[1].ID},
	}
	DB.Create(&likes)

	matches := []models.Match{
		{User1ID: users[0].ID, User2ID: users[1].ID},
	}
	DB.Create(&matches)

	// ── Conversations & Messages ────────────────────────────
	convos := []models.Conversation{
		{User1ID: users[0].ID, User2ID: users[1].ID},
	}
	DB.Create(&convos)

	msgs := []models.Message{
		{ConversationID: convos[0].ID, SenderID: users[0].ID, Content: "Salut Marc ! Ton profil m'a beaucoup plu 😊", IsRead: true},
		{ConversationID: convos[0].ID, SenderID: users[1].ID, Content: "Merci Sophie ! Tu aimes la cuisine aussi ?", IsRead: true},
		{ConversationID: convos[0].ID, SenderID: users[0].ID, Content: "J'adore ! Tu me fais goûter un de tes plats ?", IsRead: false},
	}
	DB.Create(&msgs)

	// ── Notifications ───────────────────────────────────────
	notifs := []models.Notification{
		{UserID: users[0].ID, Type: "match", Title: "Nouveau match !", Body: "Marc et vous avez matché", Data: `{"match_id":1}`},
		{UserID: users[1].ID, Type: "match", Title: "Nouveau match !", Body: "Sophie et vous avez matché", Data: `{"match_id":1}`},
		{UserID: users[1].ID, Type: "message", Title: "Nouveau message", Body: "Sophie vous a envoyé un message", Data: `{"conversation_id":1}`, IsRead: true},
	}
	DB.Create(&notifs)

	// ── Products (Boutique) ─────────────────────────────────
	products := []models.Product{
		{OwnerID: users[3].ID, Name: "Huile de massage relaxante", Description: "Huile bio aux huiles essentielles de lavande et ylang-ylang. Parfaite pour un massage détente en couple.", Price: 24.90, ImageURL: "https://images.unsplash.com/photo-1600428877878-1a0fd85beda8?w=400", Category: "soins", Stock: 50, IsActive: true},
		{OwnerID: users[3].ID, Name: "Bougie parfumée Monoï", Description: "Bougie artisanale au parfum de monoï. 40h de combustion. Cire de soja naturelle.", Price: 18.50, ImageURL: "https://images.unsplash.com/photo-1602607726657-e4e1a30e4c1e?w=400", Category: "ambiance", Stock: 35, IsActive: true},
		{OwnerID: users[3].ID, Name: "Coffret duo bien-être", Description: "Coffret comprenant 2 huiles de massage, 1 bougie parfumée et 2 serviettes en bambou.", Price: 65.00, ImageURL: "https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=400", Category: "coffrets", Stock: 20, IsActive: true},
		{OwnerID: users[3].ID, Name: "Tapis de yoga premium", Description: "Tapis antidérapant en caoutchouc naturel. Épaisseur 6mm. Marque Liforme.", Price: 89.00, ImageURL: "https://images.unsplash.com/photo-1592432678016-e910b452f9a2?w=400", Category: "yoga", Stock: 15, IsActive: true},
		{OwnerID: users[3].ID, Name: "Encens Nag Champa (lot de 12)", Description: "Bâtonnets d'encens traditionnels indiens. Parfum floral et boisé.", Price: 9.90, ImageURL: "https://images.unsplash.com/photo-1600431521340-491eca880813?w=400", Category: "ambiance", Stock: 100, IsActive: true},
		{OwnerID: users[3].ID, Name: "Diffuseur huiles essentielles", Description: "Diffuseur ultrasonique en bambou. Capacité 300ml, brume froide, LED multicolore.", Price: 39.90, ImageURL: "https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?w=400", Category: "ambiance", Stock: 25, IsActive: true},
		{OwnerID: users[4].ID, Name: "Bracelet perles Chakra", Description: "Bracelet en pierres naturelles 7 chakras. Pierre de lave, améthyste, turquoise.", Price: 15.00, ImageURL: "https://images.unsplash.com/photo-1573408301185-9146fe634ad0?w=400", Category: "bijoux", Stock: 40, IsActive: true},
		{OwnerID: users[4].ID, Name: "Collier coquillages Cauri", Description: "Collier artisanal en coquillages cauris. Cordon ajustable en coton ciré.", Price: 22.00, ImageURL: "https://images.unsplash.com/photo-1515562141589-67f0d0e4de01?w=400", Category: "bijoux", Stock: 30, IsActive: true},
		{OwnerID: users[3].ID, Name: "Gommage corporel Café-Coco", Description: "Gommage exfoliant au marc de café et huile de coco vierge. 250g.", Price: 19.90, ImageURL: "https://images.unsplash.com/photo-1608181831718-20bf4b1b2efa?w=400", Category: "soins", Stock: 45, IsActive: true},
		{OwnerID: users[3].ID, Name: "Coussin de méditation Zafu", Description: "Coussin rond rempli d'épeautre bio. Housse en coton lavable. Coloris indigo.", Price: 42.00, ImageURL: "https://images.unsplash.com/photo-1545205597-3d9d02c29597?w=400", Category: "yoga", Stock: 18, IsActive: true},
	}
	DB.Create(&products)
	log.Printf("Seed: created %d products", len(products))

	// ── Delivery Addresses ──────────────────────────────────
	addresses := []models.DeliveryAddress{
		{UserID: users[0].ID, Label: "Maison", FullName: "Sophie Martin", Phone: "+33612345001", Address: "15 Rue de la Paix", City: "Paris", PostalCode: "75002", Country: "France", IsDefault: true},
		{UserID: users[1].ID, Label: "Bureau", FullName: "Marc Dupont", Phone: "+33612345002", Address: "8 Place Bellecour", City: "Lyon", PostalCode: "69002", Country: "France", IsDefault: true},
	}
	DB.Create(&addresses)

	// ── Orders ──────────────────────────────────────────────
	orders := []models.Order{
		{UserID: users[0].ID, TotalAmount: 43.40, Status: "delivered", DeliveryAddressID: &addresses[0].ID},
		{UserID: users[1].ID, TotalAmount: 89.00, Status: "confirmed", DeliveryAddressID: &addresses[1].ID},
		{UserID: users[0].ID, TotalAmount: 24.90, Status: "pending"},
	}
	DB.Create(&orders)

	orderItems := []models.OrderItem{
		{OrderID: orders[0].ID, ProductID: products[0].ID, Quantity: 1, Price: 24.90},
		{OrderID: orders[0].ID, ProductID: products[1].ID, Quantity: 1, Price: 18.50},
		{OrderID: orders[1].ID, ProductID: products[3].ID, Quantity: 1, Price: 89.00},
		{OrderID: orders[2].ID, ProductID: products[0].ID, Quantity: 1, Price: 24.90},
	}
	DB.Create(&orderItems)

	// ── Places ──────────────────────────────────────────────
	places := []models.Place{
		{OwnerID: users[3].ID, Name: "Hôtel Le Jardin Secret", Description: "Boutique-hôtel de charme au cœur du Marais. Spa privatif, rooftop avec vue sur les toits de Paris.", Category: "hotel", Address: "23 Rue des Rosiers", City: "Paris", Latitude: 48.8565, Longitude: 2.3580, ImageURL: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400", Phone: "+33142789012", Website: "https://jardin-secret.example.com", Rating: 4.7, IsPartner: true},
		{OwnerID: users[3].ID, Name: "Restaurant L'Orangerie", Description: "Cuisine française gastronomique dans un cadre intimiste. Menu dégustation, accords mets-vins. Idéal pour un dîner en amoureux.", Category: "restaurant", Address: "12 Rue du Bac", City: "Paris", Latitude: 48.8558, Longitude: 2.3252, ImageURL: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400", Phone: "+33145678901", Website: "https://orangerie.example.com", Rating: 4.5, IsPartner: true},
		{OwnerID: users[3].ID, Name: "Spa des Sens", Description: "Centre de bien-être premium. Hammam, sauna, jacuzzi et soins signature. Formules duo disponibles.", Category: "leisure", Address: "45 Avenue Montaigne", City: "Paris", Latitude: 48.8670, Longitude: 2.3050, ImageURL: "https://images.unsplash.com/photo-1540555700478-4be289fbec6d?w=400", Phone: "+33147890123", Rating: 4.8, IsPartner: true},
		{OwnerID: users[3].ID, Name: "Le Bistrot de Marc", Description: "Cuisine lyonnaise authentique. Spécialités : quenelles, tablier de sapeur, tarte pralinée. Terrasse ombragée.", Category: "restaurant", Address: "5 Rue Mercière", City: "Lyon", Latitude: 45.7600, Longitude: 4.8350, ImageURL: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=400", Phone: "+33472345678", Rating: 4.3, IsPartner: false},
		{OwnerID: users[3].ID, Name: "Riad Lomi", Description: "Riad traditionnel avec patio et fontaine. 5 suites, piscine, massage sur place. Vue sur la médina.", Category: "hotel", Address: "Derb Sidi Ahmed", City: "Marrakech", Latitude: 31.6295, Longitude: -7.9811, ImageURL: "https://images.unsplash.com/photo-1590073242678-70ee3fc28f17?w=400", Phone: "+212524378901", Rating: 4.9, IsPartner: true},
		{OwnerID: users[3].ID, Name: "Beach Club Sunset", Description: "Lounge bar en bord de mer. DJ sets, cocktails artisanaux, tapas méditerranéennes. Coucher de soleil inoubliable.", Category: "leisure", Address: "Plage du Prado", City: "Marseille", Latitude: 43.2600, Longitude: 5.3800, ImageURL: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400", Phone: "+33491567890", Rating: 4.1, IsPartner: false},
		{OwnerID: users[4].ID, Name: "Teranga Lounge", Description: "Restaurant sénégalais moderne. Thiéboudienne, yassa poulet, cocktails aux fruits tropicaux. Ambiance chaleureuse.", Category: "restaurant", Address: "Avenue Cheikh Anta Diop", City: "Dakar", Latitude: 14.6937, Longitude: -17.4441, ImageURL: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400", Phone: "+221338901234", Rating: 4.6, IsPartner: true},
		{OwnerID: users[3].ID, Name: "Escape Game L'Énigme", Description: "Escape game romantique pour 2. Scénario 'Le Secret des Amants'. 60 min d'aventure à deux.", Category: "leisure", Address: "30 Rue de Rivoli", City: "Paris", Latitude: 48.8560, Longitude: 2.3490, ImageURL: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400", Phone: "+33143567890", Rating: 4.4, IsPartner: false},
	}
	DB.Create(&places)
	log.Printf("Seed: created %d places", len(places))

	// ── Place Reservations ──────────────────────────────────
	futureDate := now.AddDate(0, 0, 14)
	pastDate := now.AddDate(0, 0, -7)
	placeRes := []models.PlaceReservation{
		{PlaceID: places[1].ID, UserID: users[0].ID, Date: futureDate, Persons: 2, Status: "confirmed", Notes: "Table en terrasse si possible"},
		{PlaceID: places[0].ID, UserID: users[0].ID, Date: futureDate, EndDate: futureDate.AddDate(0, 0, 2), Persons: 2, Status: "confirmed", Notes: "Suite avec vue"},
		{PlaceID: places[3].ID, UserID: users[1].ID, Date: pastDate, Persons: 4, Status: "completed"},
	}
	DB.Create(&placeRes)

	// ── Wellness Providers ──────────────────────────────────
	providers := []models.WellnessProvider{
		{OwnerID: users[3].ID, Name: "Zen & Harmonie", Description: "Centre de massage et relaxation au cœur de Paris. Techniques traditionnelles thaïlandaises et balinaises. Ambiance zen garantie.", Category: "spa", ImageURL: "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=400", Phone: "+33143210987", Email: "contact@zenharmonie.com", Address: "18 Rue de Turenne", City: "Paris", Latitude: 48.8580, Longitude: 2.3630, Rating: 4.8, ReviewCount: 24, Certifications: `["FFMBE","Praticien certifié"]`, MobileService: false, IsVerified: true, IsActive: true},
		{OwnerID: users[3].ID, Name: "Maya Massage à Domicile", Description: "Massages bien-être à domicile. Je me déplace chez vous avec tout le matériel. Paris et petite couronne.", Category: "massage_home", ImageURL: "https://images.unsplash.com/photo-1519823551278-64ac92734314?w=400", Phone: "+33678901234", Email: "maya@massage.com", Address: "Paris - Déplacement", City: "Paris", Latitude: 48.8530, Longitude: 2.3490, Rating: 4.9, ReviewCount: 42, Certifications: `["FFMBE","Shiatsu"]`, MobileService: true, IsVerified: true, IsActive: true},
		{OwnerID: users[3].ID, Name: "Studio Yoga Lumière", Description: "Cours de yoga et méditation pour tous niveaux. Hatha, Vinyasa, Yin Yoga. Cours individuels et en duo.", Category: "yoga", ImageURL: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=400", Phone: "+33145678902", Email: "info@yogalumiere.com", Address: "7 Rue Oberkampf", City: "Paris", Latitude: 48.8650, Longitude: 2.3800, Rating: 4.6, ReviewCount: 18, Certifications: `["Yoga Alliance RYT-500"]`, MobileService: false, IsVerified: true, IsActive: true},
		{OwnerID: users[4].ID, Name: "Teranga Spa Dakar", Description: "Spa de luxe avec vue sur l'océan. Soins traditionnels africains, beurre de karité, argile du Sahel.", Category: "spa", ImageURL: "https://images.unsplash.com/photo-1600334089648-b0d9d3028eb2?w=400", Phone: "+221775678901", Email: "spa@teranga.sn", Address: "Route de la Corniche", City: "Dakar", Latitude: 14.6850, Longitude: -17.4600, Rating: 4.7, ReviewCount: 15, Certifications: `["CIDESCO"]`, MobileService: false, IsVerified: true, IsActive: true},
		{OwnerID: users[3].ID, Name: "Coach Sarah Fit", Description: "Coaching sportif personnalisé. Remise en forme, perte de poids, préparation physique. En salle ou en extérieur.", Category: "coaching", ImageURL: "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400", Phone: "+33698765432", Email: "sarah@coachfit.com", Address: "Parc Monceau", City: "Paris", Latitude: 48.8790, Longitude: 2.3090, Rating: 4.5, ReviewCount: 31, Certifications: `["BPJEPS","CrossFit L2"]`, MobileService: true, IsVerified: true, IsActive: true},
	}
	DB.Create(&providers)
	log.Printf("Seed: created %d wellness providers", len(providers))

	// ── Wellness Services ───────────────────────────────────
	services := []models.WellnessService{
		// Zen & Harmonie
		{ProviderID: providers[0].ID, Name: "Massage relaxant", Description: "Massage suédois aux huiles essentielles. Détente profonde du corps et de l'esprit.", Duration: 60, Price: 75.00, Category: "relaxation", IsDuo: false, IsActive: true},
		{ProviderID: providers[0].ID, Name: "Massage duo relaxant", Description: "Massage relaxant en duo dans notre salle VIP. 2 praticiens simultanés.", Duration: 60, Price: 140.00, Category: "relaxation", IsDuo: true, IsActive: true},
		{ProviderID: providers[0].ID, Name: "Massage pierres chaudes", Description: "Massage aux pierres de basalte chauffées. Dénoue les tensions musculaires.", Duration: 90, Price: 95.00, Category: "hot_stones", IsDuo: false, IsActive: true},
		{ProviderID: providers[0].ID, Name: "Massage thaïlandais", Description: "Massage traditionnel thaï. Pressions et étirements pour rééquilibrer les énergies.", Duration: 75, Price: 85.00, Category: "thai", IsDuo: false, IsActive: true},
		// Maya Massage à Domicile
		{ProviderID: providers[1].ID, Name: "Massage relaxant à domicile", Description: "Je viens chez vous avec table de massage et huiles. Idéal pour se détendre sans se déplacer.", Duration: 60, Price: 90.00, Category: "relaxation", IsDuo: false, IsActive: true},
		{ProviderID: providers[1].ID, Name: "Massage duo à domicile", Description: "Massage en duo chez vous. Je viens avec un(e) collègue. 2 tables, 2 praticiens.", Duration: 60, Price: 170.00, Category: "relaxation", IsDuo: true, IsActive: true},
		{ProviderID: providers[1].ID, Name: "Massage sportif", Description: "Massage profond pour sportifs. Récupération musculaire et décontraction.", Duration: 45, Price: 70.00, Category: "sport", IsDuo: false, IsActive: true},
		// Studio Yoga Lumière
		{ProviderID: providers[2].ID, Name: "Cours Hatha Yoga", Description: "Cours de Hatha Yoga pour débutants et intermédiaires. Postures, respiration, méditation.", Duration: 75, Price: 25.00, Category: "yoga", IsDuo: false, IsActive: true},
		{ProviderID: providers[2].ID, Name: "Yoga duo en privé", Description: "Cours privé de yoga pour 2 personnes. Programme personnalisé selon vos besoins.", Duration: 90, Price: 80.00, Category: "yoga", IsDuo: true, IsActive: true},
		{ProviderID: providers[2].ID, Name: "Méditation guidée", Description: "Séance de méditation de pleine conscience. Techniques de respiration et relaxation profonde.", Duration: 45, Price: 20.00, Category: "meditation", IsDuo: false, IsActive: true},
		// Teranga Spa Dakar
		{ProviderID: providers[3].ID, Name: "Soin Karité Royal", Description: "Gommage au sable fin du Sahel suivi d'un enveloppement au beurre de karité pur.", Duration: 90, Price: 45.00, Category: "relaxation", IsDuo: false, IsActive: true},
		{ProviderID: providers[3].ID, Name: "Massage duo Océan", Description: "Massage en duo face à l'océan. Huiles d'argan et fleur d'oranger.", Duration: 75, Price: 80.00, Category: "relaxation", IsDuo: true, IsActive: true},
		// Coach Sarah Fit
		{ProviderID: providers[4].ID, Name: "Coaching individuel", Description: "Séance de sport personnalisée. Cardio, renforcement, stretching.", Duration: 60, Price: 55.00, Category: "sport", IsDuo: false, IsActive: true},
		{ProviderID: providers[4].ID, Name: "Coaching duo", Description: "Séance de sport en binôme. Plus fun, plus motivant !", Duration: 60, Price: 85.00, Category: "sport", IsDuo: true, IsActive: true},
	}
	DB.Create(&services)
	log.Printf("Seed: created %d wellness services", len(services))

	// ── Wellness Availabilities ─────────────────────────────
	avails := []models.WellnessAvailability{}
	for _, p := range providers {
		// Monday to Friday 09:00-19:00
		for d := 1; d <= 5; d++ {
			avails = append(avails, models.WellnessAvailability{ProviderID: p.ID, DayOfWeek: d, StartTime: "09:00", EndTime: "19:00"})
		}
		// Saturday 10:00-17:00
		avails = append(avails, models.WellnessAvailability{ProviderID: p.ID, DayOfWeek: 6, StartTime: "10:00", EndTime: "17:00"})
	}
	DB.Create(&avails)

	// ── Wellness Bookings ───────────────────────────────────
	futureBooking := now.AddDate(0, 0, 7)
	pastBooking := now.AddDate(0, 0, -14)
	guestID := users[1].ID

	bookings := []models.WellnessBooking{
		{UserID: users[0].ID, ServiceID: services[0].ID, ProviderID: providers[0].ID, Date: futureBooking, StartTime: "14:00", EndTime: "15:00", Persons: 1, Status: "confirmed", TotalPrice: 75.00, Notes: "Première visite"},
		{UserID: users[0].ID, ServiceID: services[1].ID, ProviderID: providers[0].ID, Date: futureBooking.AddDate(0, 0, 3), StartTime: "16:00", EndTime: "17:00", Persons: 2, GuestID: &guestID, Status: "confirmed", TotalPrice: 140.00, Notes: "Massage duo avec Marc"},
		{UserID: users[1].ID, ServiceID: services[4].ID, ProviderID: providers[1].ID, Date: pastBooking, StartTime: "10:00", EndTime: "11:00", Persons: 1, Status: "completed", TotalPrice: 90.00},
		{UserID: users[2].ID, ServiceID: services[7].ID, ProviderID: providers[2].ID, Date: pastBooking.AddDate(0, 0, 2), StartTime: "09:00", EndTime: "10:15", Persons: 1, Status: "completed", TotalPrice: 25.00},
		{UserID: users[4].ID, ServiceID: services[10].ID, ProviderID: providers[3].ID, Date: pastBooking.AddDate(0, 0, 5), StartTime: "11:00", EndTime: "12:30", Persons: 1, Status: "completed", TotalPrice: 45.00},
	}
	DB.Create(&bookings)

	// ── Wellness Reviews ────────────────────────────────────
	reviews := []models.WellnessReview{
		{UserID: users[1].ID, BookingID: bookings[2].ID, ProviderID: providers[1].ID, Rating: 5, Comment: "Maya est exceptionnelle ! Massage parfait, je recommande à 100%."},
		{UserID: users[2].ID, BookingID: bookings[3].ID, ProviderID: providers[2].ID, Rating: 4, Comment: "Très bon cours de yoga, prof attentive. Studio un peu petit."},
		{UserID: users[4].ID, BookingID: bookings[4].ID, ProviderID: providers[3].ID, Rating: 5, Comment: "Le soin Karité est divin ! Vue magnifique sur l'océan."},
	}
	DB.Create(&reviews)

	log.Println("Seed: demo data inserted successfully ✓")
}
