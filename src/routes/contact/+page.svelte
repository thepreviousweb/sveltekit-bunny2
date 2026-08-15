<script lang="ts">
	let { form } = $props();
</script>

<h1>Contact</h1>
<p>Simpele form action om SSR/server op Bunny Edge Scripting te testen.</p>

{#if form?.success}
	<p class="success">Bedankt {form.name}! Je bericht is ontvangen (demo, niets verstuurd).</p>
{:else}
	<form method="POST">
		<label>
			Naam
			<input name="name" value={form?.name ?? ''} required />
		</label>
		<label>
			Bericht
			<textarea name="message" rows="4" required>{form?.message ?? ''}</textarea>
		</label>
		{#if form?.error}
			<p>{form.error}</p>
		{/if}
		<button type="submit">Verstuur</button>
	</form>
{/if}
