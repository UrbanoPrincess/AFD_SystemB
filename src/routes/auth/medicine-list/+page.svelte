<script lang="ts">
    import { onMount } from "svelte";
    import { getFirestore, collection, getDocs } from "firebase/firestore";
    import { firebaseConfig } from "$lib/firebaseConfig";
    import { initializeApp, getApps, getApp } from "firebase/app";
    
    type Medicine = {
        name: string;
        quantity: number;
        description: string;
        imageUrl?: string;
    };

    const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
    const firestore = getFirestore(app);

    let medicines: Medicine[] = [];

    onMount(async () => {
        const medicinesCollection = collection(firestore, "medicines");
        const medicineSnapshot = await getDocs(medicinesCollection);
        medicines = medicineSnapshot.docs.map(doc => doc.data() as Medicine);
    });
</script>

<style>
.container {
    padding: 1rem;
    margin: 0 auto;
    max-width: 1200px;
    height: 100%; 
    overflow-y: auto;
    transition: background-color 0.3s, box-shadow 0.3s; /* Smooth transition */
}

.grid {
    display: grid;
    gap: 20px;
    margin-bottom: 20px; 
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); /* Responsive grid */
}

.medicine-card {
    background-color: white;
    padding: 20px;
    border-radius: 8px;
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    height: 100%; 
    
}
.medicine-card:hover{
background-color: #f5f5f5; 
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.658); 
    transform: scale(1.01); 
}
.image-preview {
    width: 100%;
    height: 200px;
    object-fit: cover;
    border-radius: 8px;
    background-color: #f0f0f0;
}

.medicine-name {
    font-size: 1.25rem;
    font-weight: bold;
    margin-top: 10px;
}

.medicine-description {
    color: #666;
    margin-top: 10px;
    flex-grow: 1;
    text-align: justify;
}

.medicine-quantity {
    margin-top: 10px;
    margin-bottom: 0
}

</style>

<div class="container">
    <h1 class="text-2xl font-semibold mb-4">In-stock Medicines</h1>

    <div class="grid">
        {#each medicines as medicine}
            <div class="medicine-card">
                {#if medicine.imageUrl}
                    <img src={medicine.imageUrl} alt={medicine.name} class="image-preview" />
                {:else}
                    <div class="image-preview"></div>
                {/if}
                <div class="medicine-name">{medicine.name}</div>
                <div class="medicine-description">{medicine.description}</div>
                <div class="medicine-quantity">Quantity: {medicine.quantity}</div>
            </div>
        {/each}
    </div>
</div>
