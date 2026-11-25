package com.connect.community

import android.content.Context
import android.widget.FrameLayout
import io.livekit.android.LiveKit
import io.livekit.android.events.RoomEvent
import io.livekit.android.events.collect
import io.livekit.android.renderer.SurfaceViewRenderer
import io.livekit.android.room.Room
import io.livekit.android.room.track.VideoTrack
import kotlinx.coroutines.*

/** Native LiveKit/WebRTC transport; credentials only from authorized Edge Functions. */
class NativeVideo(private val context: Context) {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main.immediate)
    private var room: Room? = null
    private var renderer: SurfaceViewRenderer? = null
    private var rendered: VideoTrack? = null
    private var events: Job? = null
    private var joining: Job? = null
    private var generation = 0
    private var camera = false
    private var microphone = false
    private fun detach() {
        renderer?.let { view ->
            rendered?.removeRenderer(view)
            view.release()
            (view.parent as? FrameLayout)?.removeView(view)
        }
        renderer = null
        rendered = null
    }
    fun start(target: FrameLayout, url: String, token: String, publisher: Boolean, onStatus: java.util.function.Consumer<String>) {
        stop()
        require(url.startsWith("wss://"))
        val gen = ++generation
        val next = LiveKit.create(context.applicationContext)
        room = next
        val view = SurfaceViewRenderer(context)
        next.initVideoRenderer(view)
        target.addView(view, FrameLayout.LayoutParams(-1,-1))
        renderer = view
        events = scope.launch {
            next.events.collect { event ->
                if (generation == gen && event is RoomEvent.TrackSubscribed && event.track is VideoTrack) {
                    val track = event.track as VideoTrack
                    rendered?.removeRenderer(view)
                    rendered = track
                    track.addRenderer(view)
                    onStatus.accept("Vídeo conectado")
                }
                if (generation == gen && event is RoomEvent.Disconnected) onStatus.accept("Sessão de vídeo encerrada")
            }
        }
        joining = scope.launch {
            try {
                next.connect(url, token)
                if (publisher && generation == gen) {
                    next.localParticipant.setMicrophoneEnabled(true)
                    microphone = true
                    next.localParticipant.setCameraEnabled(true)
                    camera = true
                }
                if (generation == gen) onStatus.accept("Conectado · aguardando participantes")
            } catch (e: CancellationException) { throw e }
            catch (_: Exception) {
                if (generation == gen) { stop(); onStatus.accept("Não foi possível conectar o vídeo. Tente novamente.") }
            }
        }
    }
    fun toggleCamera() { val current = room ?: return; scope.launch { try { camera = !camera; current.localParticipant.setCameraEnabled(camera) } catch (_:Exception) { camera = false } } }
    fun toggleMic() { val current = room ?: return; scope.launch { try { microphone = !microphone; current.localParticipant.setMicrophoneEnabled(microphone) } catch (_:Exception) { microphone = false } } }
    fun stop() {
        ++generation
        joining?.cancel(); joining = null
        events?.cancel(); events = null
        detach()
        room?.disconnect()
        room?.release()
        room = null
        camera = false; microphone = false
    }
    fun destroy() { stop(); scope.cancel() }
}
