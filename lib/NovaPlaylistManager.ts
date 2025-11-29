/**
 * ======================================================
 *  👑 NovaPlaylistManager — V3.2 SafeQueue
 * ------------------------------------------------------
 *  Gestionnaire global de la file d’attente (queue[]) des
 *  vidéos du moteur Playlist.
 *
 *  ✅ Convertit automatiquement tout objet { url } en string
 *  ✅ Évite les [object Object] → 404
 *  ✅ Logs clairs et file auto-reprise
 * ======================================================
 */

export class NovaPlaylistManager {
  private queue: string[] = []
  private listeners: ((src: string | null) => void)[] = []
  public isPlaying = false // Made public for debugging
  private currentSrc: string | null = null

  /**
   * ➕ Ajoute une ou plusieurs vidéos dans la file
   */
  add(...videos: any[]) {
    if (!videos.length) return

    // 🧠 Sécurisation : conversion automatique en string pure
    const normalized = videos
      .map((v) => {
        if (typeof v === "string") return v
        if (v && typeof v === "object" && "url" in v) return v.url
        console.warn("⚠️ [NovaPlaylistManager] vidéo ignorée (type inconnu):", v)
        return null
      })
      .filter((v): v is string => typeof v === "string" && v.trim().length > 0)

    if (!normalized.length) {
      console.warn("⚠️ [NovaPlaylistManager] aucune vidéo valide ajoutée", videos)
      return
    }

    console.log(`🎞️ PlaylistManager.add → ${normalized.length} vidéos ajoutées`, normalized)
    this.queue.push(...normalized)

    if (!this.isPlaying && !this.currentSrc) {
      console.log("[v0] PlaylistManager: No video playing, triggering next()")
      this.next()
    }
  }

  /**
   * ▶️ Passe à la vidéo suivante (appelée par onEnded)
   */
  next() {
    const nextVideo = this.queue.shift() || null

    if (nextVideo) {
      this.isPlaying = true
      this.currentSrc = nextVideo
      console.log("🎬 Lecture du prochain clip :", nextVideo)
      this.notify(nextVideo)
    } else {
      console.log("⏸ Playlist vide, attente de nouveaux clips")
      this.isPlaying = false
      this.currentSrc = null
      this.notify(null)
    }
  }

  /**
   * 🔔 Notifie tous les abonnés
   */
  private notify(src: string | null) {
    this.listeners.forEach((cb) => {
      try {
        cb(src)
      } catch (err) {
        console.warn("⚠️ Erreur listener playlist:", err)
      }
    })
  }

  /**
   * 👂 Abonne un listener au flux vidéo
   * ➕ Envoie immédiatement la vidéo courante si elle existe
   */
  subscribe(cb: (src: string | null) => void) {
    if (this.listeners.includes(cb)) {
      console.log("[v0] PlaylistManager: Listener already subscribed, skipping")
      return
    }

    this.listeners.push(cb)
    console.log("[v0] PlaylistManager: New listener subscribed, total:", this.listeners.length)

    if (this.currentSrc) {
      console.log("🔁 PlaylistManager.subscribe → émission immédiate du clip courant")
      cb(this.currentSrc)
    }
  }

  /**
   * 🗑️ Unsubscribe a listener
   */
  unsubscribe(cb: (src: string | null) => void) {
    const index = this.listeners.indexOf(cb)
    if (index > -1) {
      this.listeners.splice(index, 1)
      console.log("[v0] PlaylistManager: Listener unsubscribed, remaining:", this.listeners.length)
    }
  }

  /**
   * ♻️ Réinitialise complètement la file
   */
  reset() {
    console.log("♻️ PlaylistManager.reset()")
    this.queue = []
    this.isPlaying = false
    this.currentSrc = null
  }

  /**
   * 🧹 Vide la file et stoppe tout
   */
  clear() {
    console.log("🧹 PlaylistManager.clear()")
    this.queue = []
    this.isPlaying = false
    this.currentSrc = null
    this.notify(null)
  }

  /**
   * 📊 Retourne la taille de la file
   */
  size() {
    return this.queue.length
  }

  /**
   * 📜 Debug
   */
  debug() {
    console.log("📜 File actuelle :", this.queue)
  }
}
