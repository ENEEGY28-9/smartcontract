# Hướng Dẫn Tạo Game Subway Surfers Hoàn Chỉnh

## Tổng Quan Dự Án

Subway Surfers là một game mobile 3D endless runner nổi tiếng được phát triển bởi Kiloo và SYBO Games. Game có gameplay đơn giản nhưng gây nghiện với việc điều khiển nhân vật chạy trên đường ray tàu điện ngầm, né tránh chướng ngại vật và thu thập tiền xu.

## Phân Tích Game Gốc

### Các Tính năng Chính:
- **Endless Runner**: Chạy vô tận với tốc độ tăng dần
- **3 Lane System**: Di chuyển giữa 3 làn đường
- **Jump & Slide**: Né tránh chướng ngại vật
- **Power-ups**: Jetpack, Super Sneakers, Coin Magnet, 2x Multiplier
- **Daily Challenges**: Nhiệm vụ hàng ngày
- **Character System**: Nhiều nhân vật với khả năng đặc biệt
- **Hoverboard**: Ván trượt bảo vệ khỏi va chạm
- **Social Features**: Leaderboard, achievements

## Công Nghệ Và Công Cụ Cần Thiết

### Game Engine:
- **Unity 3D** (Khuyến nghị) - Phiên bản 2020.3 LTS trở lên
- **Unreal Engine** (Tùy chọn nâng cao)

### Công Cụ Phát Triển:
- **Visual Studio** hoặc **Visual Studio Code** (C# scripting)
- **Blender** hoặc **Maya** (3D modeling)
- **Adobe Photoshop** hoặc **GIMP** (2D assets)
- **Audacity** (Audio editing)

### Platform Target:
- **iOS**: iPhone 6S trở lên
- **Android**: API level 21 trở lên
- **PC**: Windows 10 trở lên (để test)

## Cấu Trúc Dự Án Chi Tiết

### 1. Chuẩn Bị Project Structure

```
SubwaySurfers/
├── Assets/
│   ├── Scripts/
│   │   ├── Core/
│   │   │   ├── GameManager.cs
│   │   │   ├── PlayerController.cs
│   │   │   └── CameraController.cs
│   │   ├── Environment/
│   │   │   ├── TrackGenerator.cs
│   │   │   ├── ObstacleSpawner.cs
│   │   │   └── PowerUpManager.cs
│   │   ├── UI/
│   │   │   ├── UIManager.cs
│   │   │   ├── ScoreManager.cs
│   │   │   └── MenuManager.cs
│   │   └── Audio/
│   │       └── AudioManager.cs
│   ├── Prefabs/
│   │   ├── Player/
│   │   ├── Environment/
│   │   ├── Obstacles/
│   │   ├── PowerUps/
│   │   └── UI/
│   ├── Models/
│   │   ├── Characters/
│   │   ├── Environment/
│   │   └── Props/
│   ├── Materials/
│   ├── Textures/
│   ├── Audio/
│   └── Animations/
├── Scenes/
│   ├── MainMenu.unity
│   ├── GameScene.unity
│   └── ShopScene.unity
└── Resources/
```

## Gameplay Design Chi Tiết

### 2. Hệ Thống Điều Khiển Player

```csharp
// PlayerController.cs - Main movement system
public class PlayerController : MonoBehaviour
{
    [Header("Movement Settings")]
    public float forwardSpeed = 10f;
    public float laneDistance = 2.5f;
    public float sideSpeed = 15f;
    public float jumpHeight = 5f;
    public float jumpSpeed = 8f;

    private int currentLane = 1; // 0: Left, 1: Middle, 2: Right
    private bool isJumping = false;
    private bool isSliding = false;
    private CharacterController controller;
    private Vector3 moveDirection = Vector3.zero;

    void Update()
    {
        // Forward movement
        transform.Translate(Vector3.forward * forwardSpeed * Time.deltaTime);

        // Side movement input
        HandleSideMovement();

        // Jump input
        HandleJump();

        // Slide input
        HandleSlide();
    }

    void HandleSideMovement()
    {
        if (Input.GetKeyDown(KeyCode.A) || Input.GetKeyDown(KeyCode.LeftArrow))
        {
            MoveLane(false); // Left
        }
        if (Input.GetKeyDown(KeyCode.D) || Input.GetKeyDown(KeyCode.RightArrow))
        {
            MoveLane(true); // Right
        }
    }

    void MoveLane(bool goingRight)
    {
        int targetLane = currentLane + (goingRight ? 1 : -1);
        targetLane = Mathf.Clamp(targetLane, 0, 2);

        if (targetLane != currentLane)
        {
            currentLane = targetLane;
            Vector3 targetPosition = transform.position;
            targetPosition.x = (currentLane - 1) * laneDistance;
            StartCoroutine(MoveToPosition(targetPosition));
        }
    }

    IEnumerator MoveToPosition(Vector3 targetPos)
    {
        Vector3 startPos = transform.position;
        float elapsedTime = 0f;
        float moveTime = laneDistance / sideSpeed;

        while (elapsedTime < moveTime)
        {
            transform.position = Vector3.Lerp(startPos, targetPos, elapsedTime / moveTime);
            elapsedTime += Time.deltaTime;
            yield return null;
        }

        transform.position = targetPos;
    }
}
```

### 3. Hệ Thống Tạo Đường Ray

```csharp
// TrackGenerator.cs - Endless track generation
public class TrackGenerator : MonoBehaviour
{
    public GameObject[] trackSections;
    public int sectionsAhead = 5;
    public int sectionsBehind = 3;
    public float sectionLength = 20f;

    private List<GameObject> activeSections = new List<GameObject>();
    private Vector3 lastSectionEnd = Vector3.zero;

    void Start()
    {
        GenerateInitialSections();
    }

    void Update()
    {
        // Remove old sections
        if (activeSections.Count > 0)
        {
            float distance = Vector3.Distance(Player.position, activeSections[0].transform.position);
            if (distance > sectionsBehind * sectionLength)
            {
                DestroySection(0);
            }
        }

        // Add new sections
        if (ShouldGenerateNewSection())
        {
            GenerateNewSection();
        }
    }

    bool ShouldGenerateNewSection()
    {
        if (activeSections.Count == 0) return true;

        float distanceToLast = Vector3.Distance(Player.position, lastSectionEnd);
        return distanceToLast < sectionsAhead * sectionLength;
    }

    void GenerateNewSection()
    {
        int randomIndex = Random.Range(0, trackSections.Length);
        GameObject newSection = Instantiate(trackSections[randomIndex], lastSectionEnd, Quaternion.identity);
        activeSections.Add(newSection);
        lastSectionEnd += Vector3.forward * sectionLength;
    }
}
```

### 4. Hệ Thống Chướng Ngại Vật

```csharp
// ObstacleSpawner.cs - Dynamic obstacle placement
public class ObstacleSpawner : MonoBehaviour
{
    public GameObject[] obstaclePrefabs;
    public float minObstacleDistance = 10f;
    public float maxObstacleDistance = 25f;
    public int maxObstaclesPerSection = 3;

    private float lastObstaclePosition = 0f;

    public void SpawnObstaclesInSection(Vector3 sectionStart)
    {
        int obstacleCount = Random.Range(1, maxObstaclesPerSection + 1);
        List<Vector3> spawnPositions = GenerateSpawnPositions(obstacleCount, sectionStart);

        foreach (Vector3 pos in spawnPositions)
        {
            SpawnObstacle(pos);
        }
    }

    List<Vector3> GenerateSpawnPositions(int count, Vector3 sectionStart)
    {
        List<Vector3> positions = new List<Vector3>();
        float sectionLength = 20f; // Adjust based on your track section length

        for (int i = 0; i < count; i++)
        {
            float randomZ = Random.Range(2f, sectionLength - 2f);
            int randomLane = Random.Range(0, 3); // 0: Left, 1: Middle, 2: Right
            float xPos = (randomLane - 1) * 2.5f; // Lane width

            Vector3 spawnPos = sectionStart + new Vector3(xPos, 0f, randomZ);
            positions.Add(spawnPos);
        }

        return positions;
    }

    void SpawnObstacle(Vector3 position)
    {
        int randomPrefab = Random.Range(0, obstaclePrefabs.Length);
        Instantiate(obstaclePrefabs[randomPrefab], position, Quaternion.identity);
    }
}
```

## Hệ Thống Nhân Vật Và Trang Phục

### 5. Character System

```csharp
// CharacterManager.cs - Character selection and abilities
public class CharacterManager : MonoBehaviour
{
    public CharacterData[] availableCharacters;
    public int currentCharacterIndex = 0;

    [System.Serializable]
    public class CharacterData
    {
        public string characterName;
        public GameObject characterPrefab;
        public int unlockCost;
        public bool isUnlocked;
        public Sprite characterIcon;
        public string specialAbility;
    }

    public void SelectCharacter(int index)
    {
        if (index >= 0 && index < availableCharacters.Length && availableCharacters[index].isUnlocked)
        {
            currentCharacterIndex = index;
            // Switch character model
            SwitchCharacterModel();
        }
    }

    void SwitchCharacterModel()
    {
        // Remove current character
        foreach (Transform child in playerParent)
        {
            Destroy(child.gameObject);
        }

        // Instantiate new character
        GameObject newCharacter = Instantiate(
            availableCharacters[currentCharacterIndex].characterPrefab,
            playerParent.position,
            playerParent.rotation,
            playerParent
        );

        // Update player controller reference
        playerController.UpdateCharacter(newCharacter);
    }
}
```

## Power-ups và Boosts

### 6. Power-Up System

```csharp
// PowerUpManager.cs - Collectible power-ups
public class PowerUpManager : MonoBehaviour
{
    public enum PowerUpType
    {
        Jetpack,
        SuperSneakers,
        CoinMagnet,
        Multiplier2x,
        Hoverboard
    }

    [System.Serializable]
    public class PowerUpData
    {
        public PowerUpType type;
        public GameObject prefab;
        public float duration;
        public int scoreValue;
    }

    public PowerUpData[] powerUps;
    private Dictionary<PowerUpType, Coroutine> activePowerUps = new Dictionary<PowerUpType, Coroutine>();

    public void ActivatePowerUp(PowerUpType type)
    {
        if (activePowerUps.ContainsKey(type))
        {
            StopCoroutine(activePowerUps[type]);
        }

        switch (type)
        {
            case PowerUpType.Jetpack:
                StartCoroutine(JetpackRoutine());
                break;
            case PowerUpType.SuperSneakers:
                StartCoroutine(SuperSneakersRoutine());
                break;
            case PowerUpType.CoinMagnet:
                StartCoroutine(CoinMagnetRoutine());
                break;
            case PowerUpType.Multiplier2x:
                StartCoroutine(MultiplierRoutine());
                break;
            case PowerUpType.Hoverboard:
                StartCoroutine(HoverboardRoutine());
                break;
        }
    }

    IEnumerator JetpackRoutine()
    {
        playerController.EnableJetpack();
        yield return new WaitForSeconds(powerUps[(int)PowerUpType.Jetpack].duration);
        playerController.DisableJetpack();
    }

    IEnumerator HoverboardRoutine()
    {
        playerController.EnableHoverboard();
        yield return new WaitForSeconds(powerUps[(int)PowerUpType.Hoverboard].duration);
        playerController.DisableHoverboard();
    }
}
```

## Hệ Thống Điểm Và Tiền Tệ

### 7. Score và Currency System

```csharp
// ScoreManager.cs - Points and coin collection
public class ScoreManager : MonoBehaviour
{
    public static ScoreManager instance;

    [Header("Score Settings")]
    public int baseScorePerMeter = 1;
    public float scoreMultiplier = 1f;
    public int coinsCollected = 0;

    [Header("UI References")]
    public Text scoreText;
    public Text coinsText;
    public Text multiplierText;

    private float distanceTraveled = 0f;
    private int currentScore = 0;

    void Awake()
    {
        if (instance == null) instance = this;
    }

    void Update()
    {
        // Update distance and score
        distanceTraveled += playerController.forwardSpeed * Time.deltaTime;
        currentScore = Mathf.FloorToInt(distanceTraveled * baseScorePerMeter * scoreMultiplier);

        // Update UI
        UpdateScoreUI();
    }

    public void AddCoins(int amount)
    {
        coinsCollected += amount;
        UpdateCoinsUI();
    }

    public void SetMultiplier(float multiplier)
    {
        scoreMultiplier = multiplier;
        UpdateMultiplierUI();
    }

    void UpdateScoreUI()
    {
        if (scoreText != null)
        {
            scoreText.text = currentScore.ToString("N0");
        }
    }

    void UpdateCoinsUI()
    {
        if (coinsText != null)
        {
            coinsText.text = coinsCollected.ToString();
        }
    }

    void UpdateMultiplierUI()
    {
        if (multiplierText != null && scoreMultiplier > 1f)
        {
            multiplierText.text = "x" + scoreMultiplier.ToString("F1");
        }
        else if (multiplierText != null)
        {
            multiplierText.text = "";
        }
    }
}
```

## UI/UX Design

### 8. Giao Diện Người Dùng

```csharp
// UIManager.cs - Complete UI management
public class UIManager : MonoBehaviour
{
    public GameObject startMenu;
    public GameObject gameUI;
    public GameObject gameOverMenu;
    public GameObject pauseMenu;
    public GameObject shopMenu;

    public Text scoreText;
    public Text highScoreText;
    public Text coinsText;

    public Button pauseButton;
    public Button resumeButton;
    public Button restartButton;
    public Button shopButton;

    private GameState currentState = GameState.Menu;

    public enum GameState
    {
        Menu,
        Playing,
        Paused,
        GameOver
    }

    void Start()
    {
        ShowMenu();
    }

    public void StartGame()
    {
        currentState = GameState.Playing;
        startMenu.SetActive(false);
        gameUI.SetActive(true);
        gameOverMenu.SetActive(false);
        pauseMenu.SetActive(false);

        GameManager.instance.StartGame();
    }

    public void PauseGame()
    {
        if (currentState == GameState.Playing)
        {
            currentState = GameState.Paused;
            Time.timeScale = 0f;
            gameUI.SetActive(false);
            pauseMenu.SetActive(true);
        }
    }

    public void ResumeGame()
    {
        if (currentState == GameState.Paused)
        {
            currentState = GameState.Playing;
            Time.timeScale = 1f;
            gameUI.SetActive(true);
            pauseMenu.SetActive(false);
        }
    }

    public void GameOver()
    {
        currentState = GameState.GameOver;
        Time.timeScale = 0f;
        gameUI.SetActive(false);
        gameOverMenu.SetActive(true);

        UpdateGameOverUI();
    }

    void UpdateGameOverUI()
    {
        if (highScoreText != null)
        {
            highScoreText.text = "High Score: " + ScoreManager.instance.GetHighScore().ToString("N0");
        }
    }
}
```

## Animation và Visual Effects

### 9. Character Animation System

```csharp
// CharacterAnimationController.cs - Smooth animations
public class CharacterAnimationController : MonoBehaviour
{
    private Animator animator;
    private PlayerController playerController;

    void Start()
    {
        animator = GetComponent<Animator>();
        playerController = GetComponent<PlayerController>();
    }

    void Update()
    {
        // Update animation parameters based on player state
        animator.SetFloat("Speed", playerController.forwardSpeed / 10f);
        animator.SetBool("IsJumping", playerController.isJumping);
        animator.SetBool("IsSliding", playerController.isSliding);

        // Lane change animations
        if (playerController.isChangingLane)
        {
            animator.SetTrigger("LaneChange");
        }
    }

    public void TriggerJumpAnimation()
    {
        animator.SetTrigger("Jump");
    }

    public void TriggerSlideAnimation()
    {
        animator.SetBool("Slide", true);
        StartCoroutine(ResetSlideAnimation());
    }

    IEnumerator ResetSlideAnimation()
    {
        yield return new WaitForSeconds(0.5f);
        animator.SetBool("Slide", false);
    }
}
```

## Audio System

### 10. Complete Audio Management

```csharp
// AudioManager.cs - Full audio system
public class AudioManager : MonoBehaviour
{
    public static AudioManager instance;

    [Header("Audio Sources")]
    public AudioSource musicSource;
    public AudioSource sfxSource;
    public AudioSource playerSource;

    [Header("Audio Clips")]
    public AudioClip backgroundMusic;
    public AudioClip jumpSound;
    public AudioClip slideSound;
    public AudioClip coinSound;
    public AudioClip powerUpSound;
    public AudioClip crashSound;
    public AudioClip hoverboardSound;

    void Awake()
    {
        if (instance == null)
        {
            instance = this;
            DontDestroyOnLoad(gameObject);
        }
        else
        {
            Destroy(gameObject);
        }
    }

    void Start()
    {
        PlayBackgroundMusic();
    }

    public void PlayBackgroundMusic()
    {
        if (musicSource != null && backgroundMusic != null)
        {
            musicSource.clip = backgroundMusic;
            musicSource.loop = true;
            musicSource.Play();
        }
    }

    public void PlaySFX(AudioClip clip)
    {
        if (sfxSource != null && clip != null)
        {
            sfxSource.PlayOneShot(clip);
        }
    }

    public void PlayJumpSound()
    {
        PlaySFX(jumpSound);
    }

    public void PlayCoinSound()
    {
        PlaySFX(coinSound);
    }

    public void PlayCrashSound()
    {
        PlaySFX(crashSound);
    }

    public void SetMusicVolume(float volume)
    {
        if (musicSource != null)
        {
            musicSource.volume = volume;
        }
    }

    public void SetSFXVolume(float volume)
    {
        if (sfxSource != null)
        {
            sfxSource.volume = volume;
        }
    }
}
```

## Advanced Features

### 11. Daily Challenges System

```csharp
// DailyChallenges.cs - Mission system
public class DailyChallenges : MonoBehaviour
{
    public DailyChallenge[] todaysChallenges;

    [System.Serializable]
    public class DailyChallenge
    {
        public string description;
        public ChallengeType type;
        public int targetValue;
        public int rewardCoins;
        public bool isCompleted;
    }

    public enum ChallengeType
    {
        CollectCoins,
        TravelDistance,
        UsePowerUps,
        NearMisses,
        JumpCount
    }

    void Start()
    {
        GenerateTodaysChallenges();
        LoadChallengeProgress();
    }

    void GenerateTodaysChallenges()
    {
        // Generate 3 random challenges for today
        todaysChallenges = new DailyChallenge[3];

        for (int i = 0; i < 3; i++)
        {
            ChallengeType randomType = (ChallengeType)Random.Range(0, System.Enum.GetValues(typeof(ChallengeType)).Length);
            int target = GetRandomTargetForType(randomType);
            int reward = GetRewardForTarget(target);

            todaysChallenges[i] = new DailyChallenge
            {
                description = GetChallengeDescription(randomType, target),
                type = randomType,
                targetValue = target,
                rewardCoins = reward,
                isCompleted = false
            };
        }
    }

    public void CheckChallengeProgress(ChallengeType type, int value)
    {
        foreach (var challenge in todaysChallenges)
        {
            if (challenge.type == type && !challenge.isCompleted)
            {
                challenge.currentProgress += value;

                if (challenge.currentProgress >= challenge.targetValue)
                {
                    CompleteChallenge(challenge);
                }
            }
        }
    }
}
```

## Tối Ưu Hóa Và Xuất Bản

### 12. Performance Optimization

```csharp
// PerformanceOptimizer.cs - Mobile optimization
public class PerformanceOptimizer : MonoBehaviour
{
    public int targetFPS = 60;
    public float qualityScale = 1.0f;

    void Start()
    {
        OptimizeForPlatform();
        SetQualitySettings();
    }

    void OptimizeForPlatform()
    {
        // Platform-specific optimizations
        if (Application.platform == RuntimePlatform.Android || Application.platform == RuntimePlatform.IPhonePlayer)
        {
            // Mobile optimizations
            QualitySettings.vSyncCount = 0;
            Application.targetFrameRate = targetFPS;

            // Reduce quality on lower-end devices
            if (SystemInfo.systemMemorySize < 2048) // Less than 2GB RAM
            {
                qualityScale = 0.7f;
            }
        }
        else
        {
            // PC optimizations
            QualitySettings.vSyncCount = 1;
        }
    }

    void SetQualitySettings()
    {
        // Adjust render quality
        QualitySettings.SetQualityLevel(GetQualityLevel(), true);

        // Adjust shadow quality
        QualitySettings.shadowResolution = ShadowResolution.Low;
        QualitySettings.shadows = ShadowQuality.Disable;

        // Disable expensive effects on mobile
        if (Application.isMobilePlatform)
        {
            // Disable bloom, anti-aliasing, etc.
        }
    }

    int GetQualityLevel()
    {
        if (SystemInfo.systemMemorySize < 1024) return 0; // Low
        if (SystemInfo.systemMemorySize < 2048) return 1; // Medium
        return 2; // High
    }
}
```

## Asset Creation Guide

### 13. 3D Modeling và Animation

#### Nhân vật chính (Jake):
- **Model**: Low-poly character với ~2000 triangles
- **Texture**: 512x512 diffuse map với các vùng UV tách biệt
- **Rigging**: Standard humanoid rig với bones cho chạy, nhảy, trượt
- **Animations**: Run, Jump, Slide, Idle, Death

#### Môi trường:
- **Track sections**: Modular pieces với seamless textures
- **Buildings**: Simple box buildings với varied heights và textures
- **Obstacles**: Trains, barriers, tunnels với appropriate collision

#### Lighting:
- **Directional Light**: Main sunlight
- **Point Lights**: Accent lighting cho power-ups
- **Light Probes**: For dynamic object lighting

### 14. UI Design

#### Main Menu:
- **Background**: Parallax scrolling city scene
- **Logo**: Animated Subway Surfers logo
- **Buttons**: Play, Shop, Settings, Leaderboard
- **Character Preview**: Rotating 3D character model

#### In-Game UI:
- **HUD**: Score (top-left), Coins (top-right), Power-up icons
- **Pause Button**: Top-right corner
- **Distance Meter**: Bottom-center
- **Lane Indicators**: Visual guides cho lane switching

## Testing và Debugging

### 15. Comprehensive Testing Strategy

```csharp
// GameTester.cs - Automated testing system
public class GameTester : MonoBehaviour
{
    void Start()
    {
        StartCoroutine(RunAutomatedTests());
    }

    IEnumerator RunAutomatedTests()
    {
        // Test 1: Basic movement
        yield return TestBasicMovement();

        // Test 2: Collision detection
        yield return TestCollisions();

        // Test 3: Power-up functionality
        yield return TestPowerUps();

        // Test 4: Score system
        yield return TestScoring();

        // Test 5: Performance benchmark
        yield return TestPerformance();

        Debug.Log("All tests completed!");
    }

    IEnumerator TestBasicMovement()
    {
        Debug.Log("Testing basic movement...");
        // Simulate input and verify position changes
        yield return new WaitForSeconds(2f);
    }

    IEnumerator TestCollisions()
    {
        Debug.Log("Testing collision detection...");
        // Place obstacles and verify collision responses
        yield return new WaitForSeconds(2f);
    }

    IEnumerator TestPerformance()
    {
        Debug.Log("Running performance tests...");
        float startTime = Time.realtimeSinceStartup;

        // Run intensive operations
        for (int i = 0; i < 1000; i++)
        {
            Instantiate(testObject, randomPositions[i], Quaternion.identity);
        }

        float elapsed = Time.realtimeSinceStartup - startTime;
        Debug.Log($"Performance test completed in {elapsed:F2} seconds");

        yield return null;
    }
}
```

## Deployment và Publishing

### 16. Build Settings

#### Android Build:
```csharp
// BuildScript.cs - Automated build system
public class BuildScript
{
    [MenuItem("Build/Build Android")]
    public static void BuildAndroid()
    {
        PlayerSettings.SetScriptingBackend(BuildTargetGroup.Android, ScriptingImplementation.IL2CPP);
        PlayerSettings.Android.targetArchitectures = AndroidArchitecture.ARMv7 | AndroidArchitecture.ARM64;

        // Set bundle identifier
        PlayerSettings.SetApplicationIdentifier(BuildTargetGroup.Android, "com.yourcompany.subwaysurfers");

        // Set version
        PlayerSettings.bundleVersion = "1.0.0";
        PlayerSettings.Android.bundleVersionCode = 1;

        // Build
        BuildPipeline.BuildPlayer(GetScenes(), "SubwaySurfers.apk", BuildTarget.Android, BuildOptions.None);
    }

    static string[] GetScenes()
    {
        return new string[]
        {
            "Assets/Scenes/MainMenu.unity",
            "Assets/Scenes/GameScene.unity",
            "Assets/Scenes/ShopScene.unity"
        };
    }
}
```

## Monetization Strategy

### 17. In-Game Economy

#### Virtual Currency:
- **Coins**: Thu thập trong game, mua từ shop
- **Keys**: Premium currency, mua bằng tiền thật hoặc hoàn thành challenges

#### Shop System:
- **Characters**: 500-2000 coins mỗi nhân vật
- **Hoverboards**: 300-1000 coins
- **Power-ups**: 50-200 coins mỗi cái
- **Cosmetic Items**: 100-500 coins

#### Ads Integration:
- **Rewarded Ads**: Xem ads để nhận coins hoặc keys
- **Interstitial Ads**: Hiển thị sau game over
- **Banner Ads**: Bottom của main menu

## Analytics và User Engagement

### 18. Game Analytics

```csharp
// AnalyticsManager.cs - Track player behavior
public class AnalyticsManager : MonoBehaviour
{
    void Start()
    {
        InitializeAnalytics();
    }

    void InitializeAnalytics()
    {
        // Initialize your analytics SDK (e.g., GameAnalytics, Firebase)
    }

    public void TrackGameStart()
    {
        // Track when player starts a game
    }

    public void TrackGameEnd(int score, int coinsCollected)
    {
        // Track game completion with stats
        var parameters = new Dictionary<string, object>
        {
            { "score", score },
            { "coins_collected", coinsCollected },
            { "session_length", Time.timeSinceLevelLoad }
        };

        // Send to analytics service
    }

    public void TrackPowerUpUsage(string powerUpName)
    {
        // Track which power-ups are used most
    }

    public void TrackPurchase(string itemName, int cost)
    {
        // Track in-app purchases
    }
}
```

## Post-Launch Maintenance

### 19. Live Operations

#### Content Updates:
- **New Characters**: Thêm nhân vật mới hàng tháng
- **New Hoverboards**: Các thiết kế đặc biệt theo sự kiện
- **Limited Events**: Events theo mùa với rewards đặc biệt
- **Balance Updates**: Điều chỉnh độ khó và economy

#### Community Management:
- **Social Media**: Regular updates và engagement
- **Player Feedback**: Listen và implement suggestions
- **Bug Fixes**: Quick response to critical issues
- **Feature Requests**: Prioritize popular requests

## Kết Luận

Việc tạo một game như Subway Surfers đòi hỏi sự kết hợp của nhiều kỹ năng:

1. **Programming**: C# với Unity, hiểu về game loops và state management
2. **3D Art**: Modeling, texturing, và animation
3. **Game Design**: Balancing, progression systems
4. **Audio**: Music, sound effects, voice acting
5. **UI/UX**: Intuitive interfaces và smooth interactions
6. **Monetization**: Smart economy design và ads integration

**Thời gian phát triển ước tính**: 6-12 tháng cho một team nhỏ (3-5 người)
**Ngân sách**: $50,000 - $200,000 tùy thuộc vào chất lượng và scope

Bắt đầu với prototype đơn giản, sau đó mở rộng dần với các tính năng nâng cao. Tập trung vào core gameplay loop trước khi thêm các features phức tạp.

---

## PHẦN MỞ RỘNG CHI TIẾT - TẠO GAME Y HỆT SUBWAY SURFERS

### 20. Hệ Thống Input Chính Xác (Mobile Touch & Swipe)

```csharp
// InputManager.cs - Complete input handling cho cả mobile và PC
public class InputManager : MonoBehaviour
{
    public static InputManager instance;
    
    [Header("Swipe Settings")]
    public float minSwipeDistance = 50f;
    public float maxSwipeTime = 0.5f;
    
    private Vector2 swipeStartPos;
    private Vector2 swipeEndPos;
    private float swipeStartTime;
    
    public enum SwipeDirection
    {
        None,
        Up,
        Down,
        Left,
        Right
    }
    
    void Awake()
    {
        if (instance == null) instance = this;
    }
    
    void Update()
    {
        HandleInput();
    }
    
    void HandleInput()
    {
        #if UNITY_EDITOR || UNITY_STANDALONE
        // PC Keyboard controls
        if (Input.GetKeyDown(KeyCode.W) || Input.GetKeyDown(KeyCode.UpArrow))
        {
            OnSwipeUp();
        }
        if (Input.GetKeyDown(KeyCode.S) || Input.GetKeyDown(KeyCode.DownArrow))
        {
            OnSwipeDown();
        }
        if (Input.GetKeyDown(KeyCode.A) || Input.GetKeyDown(KeyCode.LeftArrow))
        {
            OnSwipeLeft();
        }
        if (Input.GetKeyDown(KeyCode.D) || Input.GetKeyDown(KeyCode.RightArrow))
        {
            OnSwipeRight();
        }
        if (Input.GetKeyDown(KeyCode.Space))
        {
            OnSpacebarPressed();
        }
        #endif
        
        // Mobile touch controls
        if (Input.touchCount > 0)
        {
            Touch touch = Input.GetTouch(0);
            
            switch (touch.phase)
            {
                case TouchPhase.Began:
                    swipeStartPos = touch.position;
                    swipeStartTime = Time.time;
                    break;
                    
                case TouchPhase.Ended:
                    swipeEndPos = touch.position;
                    DetectSwipe();
                    break;
            }
        }
    }
    
    void DetectSwipe()
    {
        float swipeTime = Time.time - swipeStartTime;
        float swipeDistance = Vector2.Distance(swipeStartPos, swipeEndPos);
        
        if (swipeTime > maxSwipeTime) return;
        if (swipeDistance < minSwipeDistance) return;
        
        Vector2 swipeDirection = swipeEndPos - swipeStartPos;
        swipeDirection.Normalize();
        
        // Determine swipe direction
        if (Mathf.Abs(swipeDirection.x) > Mathf.Abs(swipeDirection.y))
        {
            // Horizontal swipe
            if (swipeDirection.x > 0)
                OnSwipeRight();
            else
                OnSwipeLeft();
        }
        else
        {
            // Vertical swipe
            if (swipeDirection.y > 0)
                OnSwipeUp();
            else
                OnSwipeDown();
        }
    }
    
    void OnSwipeUp()
    {
        PlayerController.instance.Jump();
    }
    
    void OnSwipeDown()
    {
        PlayerController.instance.Slide();
    }
    
    void OnSwipeLeft()
    {
        PlayerController.instance.MoveLeft();
    }
    
    void OnSwipeRight()
    {
        PlayerController.instance.MoveRight();
    }
    
    void OnSpacebarPressed()
    {
        PlayerController.instance.ActivateHoverboard();
    }
}
```

### 21. Hệ Thống Camera Nâng Cao (Follow Cam với Smooth Tracking)

```csharp
// CameraController.cs - Dynamic camera với shake effects
public class CameraController : MonoBehaviour
{
    public Transform target;
    public Vector3 offset = new Vector3(0f, 5f, -10f);
    
    [Header("Camera Settings")]
    public float followSpeed = 10f;
    public float lookAheadDistance = 5f;
    public float tiltAmount = 5f;
    
    [Header("Camera Shake")]
    public float shakeDuration = 0.3f;
    public float shakeMagnitude = 0.1f;
    
    private Vector3 velocity = Vector3.zero;
    private bool isShaking = false;
    private Vector3 originalPosition;
    
    void LateUpdate()
    {
        if (target == null) return;
        
        // Calculate target position
        Vector3 targetPosition = target.position + offset;
        targetPosition.z = target.position.z + lookAheadDistance;
        
        // Smooth follow
        transform.position = Vector3.SmoothDamp(transform.position, targetPosition, ref velocity, 1f / followSpeed);
        
        // Look at target with slight offset
        Vector3 lookAtPoint = target.position + Vector3.forward * 5f;
        transform.LookAt(lookAtPoint);
        
        // Add tilt based on lane position
        float tilt = GetLaneTilt();
        transform.rotation = Quaternion.Euler(transform.rotation.eulerAngles.x, transform.rotation.eulerAngles.y, tilt);
    }
    
    float GetLaneTilt()
    {
        if (PlayerController.instance != null)
        {
            int lane = PlayerController.instance.currentLane;
            return (lane - 1) * -tiltAmount; // -1, 0, 1 * tiltAmount
        }
        return 0f;
    }
    
    public void ShakeCamera()
    {
        if (!isShaking)
        {
            StartCoroutine(CameraShakeRoutine());
        }
    }
    
    IEnumerator CameraShakeRoutine()
    {
        isShaking = true;
        originalPosition = transform.localPosition;
        float elapsed = 0f;
        
        while (elapsed < shakeDuration)
        {
            float x = Random.Range(-1f, 1f) * shakeMagnitude;
            float y = Random.Range(-1f, 1f) * shakeMagnitude;
            
            transform.localPosition = originalPosition + new Vector3(x, y, 0f);
            
            elapsed += Time.deltaTime;
            yield return null;
        }
        
        transform.localPosition = originalPosition;
        isShaking = false;
    }
}
```

### 22. Collision System Hoàn Chỉnh với Multiple States

```csharp
// CollisionHandler.cs - Complete collision detection
public class CollisionHandler : MonoBehaviour
{
    public enum CollisionType
    {
        None,
        Obstacle,
        Train,
        Barrier,
        Coin,
        PowerUp,
        Hoverboard
    }
    
    [Header("Collision Settings")]
    public LayerMask obstacleLayer;
    public LayerMask collectableLayer;
    public float collisionRadius = 0.5f;
    
    private bool isInvincible = false;
    private bool hasHoverboard = false;
    
    void OnTriggerEnter(Collider other)
    {
        CollisionType type = GetCollisionType(other.gameObject);
        
        switch (type)
        {
            case CollisionType.Obstacle:
            case CollisionType.Train:
            case CollisionType.Barrier:
                HandleObstacleCollision(other.gameObject);
                break;
                
            case CollisionType.Coin:
                HandleCoinCollection(other.gameObject);
                break;
                
            case CollisionType.PowerUp:
                HandlePowerUpCollection(other.gameObject);
                break;
                
            case CollisionType.Hoverboard:
                HandleHoverboardCollection(other.gameObject);
                break;
        }
    }
    
    CollisionType GetCollisionType(GameObject obj)
    {
        if (obj.CompareTag("Obstacle")) return CollisionType.Obstacle;
        if (obj.CompareTag("Train")) return CollisionType.Train;
        if (obj.CompareTag("Barrier")) return CollisionType.Barrier;
        if (obj.CompareTag("Coin")) return CollisionType.Coin;
        if (obj.CompareTag("PowerUp")) return CollisionType.PowerUp;
        if (obj.CompareTag("Hoverboard")) return CollisionType.Hoverboard;
        return CollisionType.None;
    }
    
    void HandleObstacleCollision(GameObject obstacle)
    {
        if (isInvincible) return;
        
        if (hasHoverboard)
        {
            // Hoverboard absorbs one hit
            DeactivateHoverboard();
            CreateHoverboardBreakEffect();
            AudioManager.instance.PlaySFX("HoverboardBreak");
        }
        else
        {
            // Game Over
            GameOver();
        }
    }
    
    void HandleCoinCollection(GameObject coin)
    {
        // Add coin to score
        ScoreManager.instance.AddCoins(1);
        
        // Play sound
        AudioManager.instance.PlayCoinSound();
        
        // Create particle effect
        CreateCoinCollectEffect(coin.transform.position);
        
        // Destroy coin
        Destroy(coin);
    }
    
    void HandlePowerUpCollection(GameObject powerUp)
    {
        PowerUpType type = powerUp.GetComponent<PowerUp>().type;
        PowerUpManager.instance.ActivatePowerUp(type);
        
        // Play sound
        AudioManager.instance.PlayPowerUpSound();
        
        // Create effect
        CreatePowerUpEffect(powerUp.transform.position);
        
        // Destroy power-up
        Destroy(powerUp);
    }
    
    void HandleHoverboardCollection(GameObject hoverboard)
    {
        ActivateHoverboard();
        Destroy(hoverboard);
    }
    
    public void ActivateHoverboard()
    {
        hasHoverboard = true;
        // Show hoverboard visuals
        PlayerController.instance.ShowHoverboard();
    }
    
    void DeactivateHoverboard()
    {
        hasHoverboard = false;
        PlayerController.instance.HideHoverboard();
    }
    
    void GameOver()
    {
        // Play crash sound
        AudioManager.instance.PlayCrashSound();
        
        // Camera shake
        CameraController.instance.ShakeCamera();
        
        // Stop player
        PlayerController.instance.StopPlayer();
        
        // Show game over UI
        UIManager.instance.ShowGameOver();
    }
    
    void CreateCoinCollectEffect(Vector3 position)
    {
        // Instantiate particle system
        GameObject effect = Instantiate(coinEffectPrefab, position, Quaternion.identity);
        Destroy(effect, 1f);
    }
    
    void CreatePowerUpEffect(Vector3 position)
    {
        GameObject effect = Instantiate(powerUpEffectPrefab, position, Quaternion.identity);
        Destroy(effect, 2f);
    }
    
    void CreateHoverboardBreakEffect()
    {
        GameObject effect = Instantiate(hoverboardBreakEffectPrefab, transform.position, Quaternion.identity);
        Destroy(effect, 1.5f);
    }
}
```

### 23. Procedural Generation System (Advanced)

```csharp
// ProceduralTrackGenerator.cs - Advanced track generation
public class ProceduralTrackGenerator : MonoBehaviour
{
    [Header("Track Pieces")]
    public TrackPiece[] straightPieces;
    public TrackPiece[] curvePieces;
    public TrackPiece[] specialPieces;
    
    [Header("Generation Settings")]
    public int initialPieces = 10;
    public float pieceLength = 30f;
    public int maxActivePieces = 15;
    
    [Header("Difficulty Settings")]
    public AnimationCurve difficultyCurve;
    public float difficultyIncreaseRate = 0.01f;
    
    private List<TrackPiece> activePieces = new List<TrackPiece>();
    private Queue<TrackPiece> piecePool = new Queue<TrackPiece>();
    private float currentDifficulty = 0f;
    private Vector3 nextSpawnPosition = Vector3.zero;
    
    [System.Serializable]
    public class TrackPiece
    {
        public GameObject prefab;
        public float weight = 1f;
        public int minDifficulty = 0;
        public int maxDifficulty = 100;
        public ObstaclePattern[] patterns;
    }
    
    [System.Serializable]
    public class ObstaclePattern
    {
        public ObstacleData[] obstacles;
        public CoinPattern[] coins;
    }
    
    [System.Serializable]
    public class ObstacleData
    {
        public GameObject prefab;
        public Vector3 localPosition;
        public int lane; // 0, 1, or 2
        public ObstacleHeight height; // Ground, Mid, High
    }
    
    public enum ObstacleHeight
    {
        Ground,  // Need to slide
        Mid,     // Need to jump
        High     // Need to run under
    }
    
    [System.Serializable]
    public class CoinPattern
    {
        public Vector3[] positions;
        public CoinFormation formation;
    }
    
    public enum CoinFormation
    {
        Line,
        ZigZag,
        Circle,
        Wave,
        Scattered
    }
    
    void Start()
    {
        GenerateInitialTrack();
    }
    
    void Update()
    {
        UpdateDifficulty();
        CheckForNewPiece();
        CleanupOldPieces();
    }
    
    void GenerateInitialTrack()
    {
        for (int i = 0; i < initialPieces; i++)
        {
            SpawnNextPiece();
        }
    }
    
    void UpdateDifficulty()
    {
        currentDifficulty += difficultyIncreaseRate * Time.deltaTime;
        currentDifficulty = Mathf.Clamp(currentDifficulty, 0f, 100f);
    }
    
    void CheckForNewPiece()
    {
        if (PlayerController.instance == null) return;
        
        float playerZ = PlayerController.instance.transform.position.z;
        float lastPieceZ = nextSpawnPosition.z;
        
        if (lastPieceZ - playerZ < pieceLength * maxActivePieces)
        {
            SpawnNextPiece();
        }
    }
    
    void SpawnNextPiece()
    {
        TrackPiece selectedPiece = SelectRandomPiece();
        
        GameObject newPieceObj = Instantiate(selectedPiece.prefab, nextSpawnPosition, Quaternion.identity);
        activePieces.Add(selectedPiece);
        
        // Spawn obstacles and coins for this piece
        SpawnObstaclesForPiece(newPieceObj, selectedPiece);
        SpawnCoinsForPiece(newPieceObj, selectedPiece);
        
        nextSpawnPosition += Vector3.forward * pieceLength;
    }
    
    TrackPiece SelectRandomPiece()
    {
        // Filter pieces by difficulty
        List<TrackPiece> validPieces = new List<TrackPiece>();
        float totalWeight = 0f;
        
        foreach (var piece in straightPieces)
        {
            if (currentDifficulty >= piece.minDifficulty && currentDifficulty <= piece.maxDifficulty)
            {
                validPieces.Add(piece);
                totalWeight += piece.weight;
            }
        }
        
        // Weighted random selection
        float randomValue = Random.Range(0f, totalWeight);
        float cumulativeWeight = 0f;
        
        foreach (var piece in validPieces)
        {
            cumulativeWeight += piece.weight;
            if (randomValue <= cumulativeWeight)
            {
                return piece;
            }
        }
        
        return validPieces[0]; // Fallback
    }
    
    void SpawnObstaclesForPiece(GameObject pieceObj, TrackPiece pieceData)
    {
        if (pieceData.patterns == null || pieceData.patterns.Length == 0) return;
        
        // Select random pattern
        ObstaclePattern pattern = pieceData.patterns[Random.Range(0, pieceData.patterns.Length)];
        
        foreach (var obstacleData in pattern.obstacles)
        {
            Vector3 spawnPos = pieceObj.transform.position + obstacleData.localPosition;
            GameObject obstacle = Instantiate(obstacleData.prefab, spawnPos, Quaternion.identity);
            obstacle.transform.parent = pieceObj.transform;
        }
    }
    
    void SpawnCoinsForPiece(GameObject pieceObj, TrackPiece pieceData)
    {
        if (pieceData.patterns == null || pieceData.patterns.Length == 0) return;
        
        ObstaclePattern pattern = pieceData.patterns[Random.Range(0, pieceData.patterns.Length)];
        
        foreach (var coinPattern in pattern.coins)
        {
            List<Vector3> coinPositions = GenerateCoinFormation(coinPattern.formation, pieceObj.transform.position);
            
            foreach (Vector3 pos in coinPositions)
            {
                GameObject coin = Instantiate(coinPrefab, pos, Quaternion.identity);
                coin.transform.parent = pieceObj.transform;
            }
        }
    }
    
    List<Vector3> GenerateCoinFormation(CoinFormation formation, Vector3 startPos)
    {
        List<Vector3> positions = new List<Vector3>();
        int coinCount = 20;
        float spacing = 1.5f;
        
        switch (formation)
        {
            case CoinFormation.Line:
                for (int i = 0; i < coinCount; i++)
                {
                    positions.Add(startPos + Vector3.forward * (i * spacing));
                }
                break;
                
            case CoinFormation.ZigZag:
                for (int i = 0; i < coinCount; i++)
                {
                    float xOffset = Mathf.Sin(i * 0.5f) * 2.5f;
                    positions.Add(startPos + new Vector3(xOffset, 1f, i * spacing));
                }
                break;
                
            case CoinFormation.Wave:
                for (int i = 0; i < coinCount; i++)
                {
                    float yOffset = Mathf.Sin(i * 0.3f) * 2f + 2f;
                    positions.Add(startPos + new Vector3(0f, yOffset, i * spacing));
                }
                break;
                
            case CoinFormation.Circle:
                int circleCoins = 12;
                float radius = 3f;
                for (int i = 0; i < circleCoins; i++)
                {
                    float angle = i * (360f / circleCoins) * Mathf.Deg2Rad;
                    float x = Mathf.Cos(angle) * radius;
                    float y = Mathf.Sin(angle) * radius + 2f;
                    positions.Add(startPos + new Vector3(x, y, 5f));
                }
                break;
                
            case CoinFormation.Scattered:
                for (int i = 0; i < coinCount; i++)
                {
                    float x = Random.Range(-2.5f, 2.5f);
                    float y = Random.Range(1f, 4f);
                    float z = i * spacing + Random.Range(-0.5f, 0.5f);
                    positions.Add(startPos + new Vector3(x, y, z));
                }
                break;
        }
        
        return positions;
    }
    
    void CleanupOldPieces()
    {
        if (activePieces.Count <= maxActivePieces) return;
        
        float playerZ = PlayerController.instance.transform.position.z;
        
        for (int i = activePieces.Count - 1; i >= 0; i--)
        {
            if (activePieces[i] == null) continue;
            
            float pieceZ = activePieces[i].prefab.transform.position.z;
            
            if (playerZ - pieceZ > pieceLength * 2)
            {
                Destroy(activePieces[i].prefab);
                activePieces.RemoveAt(i);
            }
        }
    }
}
```

### 24. Save/Load System Hoàn Chỉnh

```csharp
// SaveManager.cs - Complete save/load with encryption
using System.IO;
using UnityEngine;
using System.Security.Cryptography;
using System.Text;

public class SaveManager : MonoBehaviour
{
    public static SaveManager instance;
    private string saveFilePath;
    private string encryptionKey = "SubwaySurfers2024Key!"; // Change this!
    
    [System.Serializable]
    public class GameData
    {
        public int totalCoins;
        public int totalKeys;
        public int highScore;
        public int gamesPlayed;
        public float totalDistance;
        
        public CharacterSaveData[] characters;
        public HoverboardSaveData[] hoverboards;
        public PowerUpSaveData[] powerUpLevels;
        
        public MissionProgress[] missions;
        public Achievement[] achievements;
        
        public SettingsData settings;
    }
    
    [System.Serializable]
    public class CharacterSaveData
    {
        public string characterId;
        public bool isUnlocked;
        public int level;
    }
    
    [System.Serializable]
    public class HoverboardSaveData
    {
        public string hoverboardId;
        public bool isUnlocked;
    }
    
    [System.Serializable]
    public class PowerUpSaveData
    {
        public string powerUpId;
        public int level;
    }
    
    [System.Serializable]
    public class MissionProgress
    {
        public string missionId;
        public int currentProgress;
        public bool isCompleted;
    }
    
    [System.Serializable]
    public class Achievement
    {
        public string achievementId;
        public bool isUnlocked;
        public System.DateTime unlockDate;
    }
    
    [System.Serializable]
    public class SettingsData
    {
        public float musicVolume = 1f;
        public float sfxVolume = 1f;
        public bool notificationsEnabled = true;
        public string language = "en";
    }
    
    void Awake()
    {
        if (instance == null)
        {
            instance = this;
            DontDestroyOnLoad(gameObject);
        }
        else
        {
            Destroy(gameObject);
        }
        
        saveFilePath = Path.Combine(Application.persistentDataPath, "savegame.dat");
    }
    
    public void SaveGame()
    {
        GameData data = CollectGameData();
        string json = JsonUtility.ToJson(data, true);
        string encrypted = Encrypt(json);
        
        File.WriteAllText(saveFilePath, encrypted);
        Debug.Log("Game saved successfully!");
    }
    
    public GameData LoadGame()
    {
        if (!File.Exists(saveFilePath))
        {
            Debug.Log("No save file found. Creating new game data.");
            return CreateNewGameData();
        }
        
        try
        {
            string encrypted = File.ReadAllText(saveFilePath);
            string decrypted = Decrypt(encrypted);
            GameData data = JsonUtility.FromJson<GameData>(decrypted);
            
            ApplyGameData(data);
            Debug.Log("Game loaded successfully!");
            return data;
        }
        catch (System.Exception e)
        {
            Debug.LogError("Failed to load game: " + e.Message);
            return CreateNewGameData();
        }
    }
    
    GameData CollectGameData()
    {
        GameData data = new GameData();
        
        // Collect all game state
        data.totalCoins = CurrencyManager.instance.GetCoins();
        data.totalKeys = CurrencyManager.instance.GetKeys();
        data.highScore = ScoreManager.instance.GetHighScore();
        data.gamesPlayed = StatsTracker.instance.GetGamesPlayed();
        data.totalDistance = StatsTracker.instance.GetTotalDistance();
        
        // Collect character data
        data.characters = CharacterManager.instance.GetAllCharacterData();
        
        // Collect hoverboard data
        data.hoverboards = HoverboardManager.instance.GetAllHoverboardData();
        
        // Collect power-up levels
        data.powerUpLevels = PowerUpManager.instance.GetPowerUpLevels();
        
        // Collect mission progress
        data.missions = MissionManager.instance.GetAllMissions();
        
        // Collect achievements
        data.achievements = AchievementManager.instance.GetAllAchievements();
        
        // Collect settings
        data.settings = SettingsManager.instance.GetSettings();
        
        return data;
    }
    
    void ApplyGameData(GameData data)
    {
        CurrencyManager.instance.SetCoins(data.totalCoins);
        CurrencyManager.instance.SetKeys(data.totalKeys);
        ScoreManager.instance.SetHighScore(data.highScore);
        StatsTracker.instance.SetGamesPlayed(data.gamesPlayed);
        StatsTracker.instance.SetTotalDistance(data.totalDistance);
        
        CharacterManager.instance.LoadCharacterData(data.characters);
        HoverboardManager.instance.LoadHoverboardData(data.hoverboards);
        PowerUpManager.instance.LoadPowerUpLevels(data.powerUpLevels);
        MissionManager.instance.LoadMissions(data.missions);
        AchievementManager.instance.LoadAchievements(data.achievements);
        SettingsManager.instance.ApplySettings(data.settings);
    }
    
    GameData CreateNewGameData()
    {
        GameData data = new GameData();
        data.totalCoins = 0;
        data.totalKeys = 0;
        data.highScore = 0;
        data.gamesPlayed = 0;
        data.totalDistance = 0f;
        data.settings = new SettingsData();
        
        return data;
    }
    
    string Encrypt(string plainText)
    {
        byte[] key = Encoding.UTF8.GetBytes(encryptionKey.Substring(0, 16));
        byte[] iv = Encoding.UTF8.GetBytes(encryptionKey.Substring(0, 16));
        
        using (Aes aes = Aes.Create())
        {
            aes.Key = key;
            aes.IV = iv;
            
            ICryptoTransform encryptor = aes.CreateEncryptor(aes.Key, aes.IV);
            
            using (MemoryStream msEncrypt = new MemoryStream())
            {
                using (CryptoStream csEncrypt = new CryptoStream(msEncrypt, encryptor, CryptoStreamMode.Write))
                {
                    using (StreamWriter swEncrypt = new StreamWriter(csEncrypt))
                    {
                        swEncrypt.Write(plainText);
                    }
                    return System.Convert.ToBase64String(msEncrypt.ToArray());
                }
            }
        }
    }
    
    string Decrypt(string cipherText)
    {
        byte[] key = Encoding.UTF8.GetBytes(encryptionKey.Substring(0, 16));
        byte[] iv = Encoding.UTF8.GetBytes(encryptionKey.Substring(0, 16));
        byte[] buffer = System.Convert.FromBase64String(cipherText);
        
        using (Aes aes = Aes.Create())
        {
            aes.Key = key;
            aes.IV = iv;
            
            ICryptoTransform decryptor = aes.CreateDecryptor(aes.Key, aes.IV);
            
            using (MemoryStream msDecrypt = new MemoryStream(buffer))
            {
                using (CryptoStream csDecrypt = new CryptoStream(msDecrypt, decryptor, CryptoStreamMode.Read))
                {
                    using (StreamReader srDecrypt = new StreamReader(csDecrypt))
                    {
                        return srDecrypt.ReadToEnd();
                    }
                }
            }
        }
    }
}
```

### 25. Particle Effects và Visual Polish

```csharp
// VisualEffectsManager.cs - Complete VFX system
public class VisualEffectsManager : MonoBehaviour
{
    public static VisualEffectsManager instance;
    
    [Header("Particle Prefabs")]
    public GameObject coinCollectEffect;
    public GameObject powerUpActivateEffect;
    public GameObject speedBoostTrail;
    public GameObject jetpackFlames;
    public GameObject crashExplosion;
    public GameObject hoverboardGlow;
    public GameObject magneticField;
    
    [Header("Trail Settings")]
    public TrailRenderer playerTrail;
    public Material normalTrailMaterial;
    public Material speedBoostTrailMaterial;
    
    void Awake()
    {
        if (instance == null) instance = this;
    }
    
    public void PlayCoinCollectEffect(Vector3 position)
    {
        GameObject effect = Instantiate(coinCollectEffect, position, Quaternion.identity);
        ParticleSystem ps = effect.GetComponent<ParticleSystem>();
        
        // Customize particle properties
        var main = ps.main;
        main.startColor = new Color(1f, 0.84f, 0f); // Gold color
        main.startSize = Random.Range(0.2f, 0.4f);
        
        Destroy(effect, ps.main.duration);
    }
    
    public void PlayPowerUpEffect(Vector3 position, PowerUpType type)
    {
        GameObject effect = Instantiate(powerUpActivateEffect, position, Quaternion.identity);
        ParticleSystem ps = effect.GetComponent<ParticleSystem>();
        
        // Color based on power-up type
        var main = ps.main;
        switch (type)
        {
            case PowerUpType.Jetpack:
                main.startColor = Color.red;
                break;
            case PowerUpType.SuperSneakers:
                main.startColor = Color.green;
                break;
            case PowerUpType.CoinMagnet:
                main.startColor = Color.yellow;
                break;
            case PowerUpType.Multiplier2x:
                main.startColor = Color.blue;
                break;
        }
        
        Destroy(effect, 2f);
    }
    
    public void EnableSpeedTrail()
    {
        if (playerTrail != null)
        {
            playerTrail.enabled = true;
            playerTrail.material = speedBoostTrailMaterial;
        }
    }
    
    public void DisableSpeedTrail()
    {
        if (playerTrail != null)
        {
            playerTrail.material = normalTrailMaterial;
        }
    }
    
    public void ActivateJetpackFlames()
    {
        if (jetpackFlames != null)
        {
            jetpackFlames.SetActive(true);
        }
    }
    
    public void DeactivateJetpackFlames()
    {
        if (jetpackFlames != null)
        {
            jetpackFlames.SetActive(false);
        }
    }
    
    public void ShowMagneticField()
    {
        if (magneticField != null)
        {
            magneticField.SetActive(true);
            
            // Animate magnetic field
            StartCoroutine(PulseMagneticField());
        }
    }
    
    public void HideMagneticField()
    {
        if (magneticField != null)
        {
            magneticField.SetActive(false);
        }
    }
    
    IEnumerator PulseMagneticField()
    {
        Transform fieldTransform = magneticField.transform;
        Vector3 baseScale = Vector3.one * 5f;
        
        while (magneticField.activeSelf)
        {
            float pulse = Mathf.Sin(Time.time * 3f) * 0.2f + 1f;
            fieldTransform.localScale = baseScale * pulse;
            yield return null;
        }
    }
    
    public void PlayCrashEffect(Vector3 position)
    {
        GameObject effect = Instantiate(crashExplosion, position, Quaternion.identity);
        
        // Add force to nearby objects
        Collider[] nearbyObjects = Physics.OverlapSphere(position, 5f);
        foreach (Collider col in nearbyObjects)
        {
            Rigidbody rb = col.GetComponent<Rigidbody>();
            if (rb != null)
            {
                rb.AddExplosionForce(500f, position, 5f);
            }
        }
        
        Destroy(effect, 3f);
    }
    
    public void EnableHoverboardGlow()
    {
        if (hoverboardGlow != null)
        {
            hoverboardGlow.SetActive(true);
        }
    }
    
    public void DisableHoverboardGlow()
    {
        if (hoverboardGlow != null)
        {
            hoverboardGlow.SetActive(false);
        }
    }
}
```

### 26. Shader và Material Effects

```csharp
// MaterialAnimator.cs - Animated materials for visual polish
public class MaterialAnimator : MonoBehaviour
{
    [Header("Coin Animation")]
    public Material coinMaterial;
    public float rotationSpeed = 50f;
    public float bobSpeed = 2f;
    public float bobHeight = 0.3f;
    
    [Header("Power-Up Glow")]
    public Material powerUpMaterial;
    public float glowPulseSpeed = 2f;
    public float maxEmission = 2f;
    
    private float startY;
    
    void Start()
    {
        startY = transform.position.y;
    }
    
    void Update()
    {
        AnimateCoinRotation();
        AnimateCoinBob();
        AnimatePowerUpGlow();
    }
    
    void AnimateCoinRotation()
    {
        if (gameObject.CompareTag("Coin"))
        {
            transform.Rotate(Vector3.up, rotationSpeed * Time.deltaTime);
        }
    }
    
    void AnimateCoinBob()
    {
        if (gameObject.CompareTag("Coin"))
        {
            float newY = startY + Mathf.Sin(Time.time * bobSpeed) * bobHeight;
            transform.position = new Vector3(transform.position.x, newY, transform.position.z);
        }
    }
    
    void AnimatePowerUpGlow()
    {
        if (gameObject.CompareTag("PowerUp") && powerUpMaterial != null)
        {
            float emission = Mathf.Lerp(0.5f, maxEmission, (Mathf.Sin(Time.time * glowPulseSpeed) + 1f) / 2f);
            powerUpMaterial.SetFloat("_EmissionIntensity", emission);
        }
    }
}
```

### 27. Physics System Hoàn Chỉnh (Gravity, Jumping, Sliding)

```csharp
// PhysicsController.cs - Realistic physics implementation
public class PhysicsController : MonoBehaviour
{
    [Header("Gravity Settings")]
    public float gravity = -25f;
    public float maxFallSpeed = -50f;
    
    [Header("Jump Settings")]
    public float jumpHeight = 3f;
    public float jumpDuration = 0.5f;
    public AnimationCurve jumpCurve;
    
    [Header("Slide Settings")]
    public float slideDuration = 1f;
    public float slideColliderHeight = 0.5f;
    public float normalColliderHeight = 2f;
    
    [Header("Ground Check")]
    public LayerMask groundLayer;
    public float groundCheckDistance = 0.2f;
    public Transform groundCheckPoint;
    
    private CharacterController controller;
    private Vector3 velocity;
    private bool isGrounded;
    private bool isJumping;
    private bool isSliding;
    
    void Start()
    {
        controller = GetComponent<CharacterController>();
        jumpCurve = AnimationCurve.EaseInOut(0f, 0f, 1f, 1f);
    }
    
    void Update()
    {
        CheckGroundStatus();
        ApplyGravity();
        HandlePhysicsMovement();
    }
    
    void CheckGroundStatus()
    {
        isGrounded = Physics.CheckSphere(groundCheckPoint.position, groundCheckDistance, groundLayer);
        
        if (isGrounded && velocity.y < 0)
        {
            velocity.y = -2f; // Small force to keep grounded
        }
    }
    
    void ApplyGravity()
    {
        if (!isGrounded)
        {
            velocity.y += gravity * Time.deltaTime;
            velocity.y = Mathf.Max(velocity.y, maxFallSpeed);
        }
    }
    
    void HandlePhysicsMovement()
    {
        // Apply vertical velocity
        controller.Move(velocity * Time.deltaTime);
    }
    
    public void PerformJump()
    {
        if (isGrounded && !isJumping)
        {
            StartCoroutine(JumpRoutine());
        }
        else if (isJumping && !isGrounded)
        {
            // Double jump if in air (jetpack or super sneakers)
            if (PowerUpManager.instance.HasSuperSneakers())
            {
                StartCoroutine(JumpRoutine());
            }
        }
    }
    
    IEnumerator JumpRoutine()
    {
        isJumping = true;
        float elapsed = 0f;
        float startY = transform.position.y;
        
        // Play jump animation
        GetComponent<Animator>().SetTrigger("Jump");
        AudioManager.instance.PlayJumpSound();
        
        while (elapsed < jumpDuration)
        {
            float curveValue = jumpCurve.Evaluate(elapsed / jumpDuration);
            float newY = startY + (jumpHeight * curveValue);
            
            Vector3 pos = transform.position;
            pos.y = newY;
            transform.position = pos;
            
            elapsed += Time.deltaTime;
            yield return null;
        }
        
        isJumping = false;
    }
    
    public void PerformSlide()
    {
        if (!isSliding && isGrounded)
        {
            StartCoroutine(SlideRoutine());
        }
    }
    
    IEnumerator SlideRoutine()
    {
        isSliding = true;
        
        // Shrink collider
        controller.height = slideColliderHeight;
        controller.center = new Vector3(0f, slideColliderHeight / 2f, 0f);
        
        // Play slide animation
        GetComponent<Animator>().SetBool("IsSliding", true);
        AudioManager.instance.PlaySlideSound();
        
        yield return new WaitForSeconds(slideDuration);
        
        // Restore collider
        controller.height = normalColliderHeight;
        controller.center = new Vector3(0f, normalColliderHeight / 2f, 0f);
        
        // Stop slide animation
        GetComponent<Animator>().SetBool("IsSliding", false);
        
        isSliding = false;
    }
    
    public bool IsGrounded()
    {
        return isGrounded;
    }
    
    public bool IsJumping()
    {
        return isJumping;
    }
    
    public bool IsSliding()
    {
        return isSliding;
    }
}
```

### 28. Inspector Chase System (Cảnh sát đuổi theo)

```csharp
// InspectorChaseSystem.cs - Police chase mechanic
public class InspectorChaseSystem : MonoBehaviour
{
    public GameObject inspectorPrefab;
    public GameObject dogPrefab;
    
    [Header("Chase Settings")]
    public float distanceBehindPlayer = 15f;
    public float catchUpSpeed = 8f;
    public float normalSpeed = 7f;
    public float maxDistance = 25f;
    public float minDistance = 10f;
    
    private GameObject activeInspector;
    private GameObject activeDog;
    private bool isChasing = false;
    
    void Start()
    {
        SpawnInspector();
    }
    
    void Update()
    {
        if (isChasing)
        {
            UpdateInspectorPosition();
            CheckCaughtPlayer();
        }
    }
    
    void SpawnInspector()
    {
        Vector3 spawnPos = PlayerController.instance.transform.position - Vector3.forward * distanceBehindPlayer;
        activeInspector = Instantiate(inspectorPrefab, spawnPos, Quaternion.identity);
        activeDog = Instantiate(dogPrefab, spawnPos + Vector3.right * 2f, Quaternion.identity);
        
        isChasing = true;
    }
    
    void UpdateInspectorPosition()
    {
        if (activeInspector == null || PlayerController.instance == null) return;
        
        Vector3 playerPos = PlayerController.instance.transform.position;
        Vector3 inspectorPos = activeInspector.transform.position;
        
        float distance = Vector3.Distance(playerPos, inspectorPos);
        
        // Adjust speed based on distance
        float currentSpeed = normalSpeed;
        if (distance > maxDistance)
        {
            currentSpeed = catchUpSpeed;
        }
        else if (distance < minDistance)
        {
            currentSpeed = normalSpeed * 0.5f;
        }
        
        // Move inspector forward
        Vector3 targetPos = playerPos - Vector3.forward * distanceBehindPlayer;
        activeInspector.transform.position = Vector3.MoveTowards(
            inspectorPos, 
            targetPos, 
            currentSpeed * Time.deltaTime
        );
        
        // Update dog position (follows inspector)
        if (activeDog != null)
        {
            Vector3 dogTargetPos = activeInspector.transform.position + Vector3.right * 2f;
            activeDog.transform.position = Vector3.MoveTowards(
                activeDog.transform.position,
                dogTargetPos,
                currentSpeed * Time.deltaTime
            );
        }
        
        // Inspector looks at player
        Vector3 lookDir = (playerPos - inspectorPos).normalized;
        activeInspector.transform.rotation = Quaternion.LookRotation(new Vector3(lookDir.x, 0f, lookDir.z));
        
        // Animate running
        Animator inspectorAnim = activeInspector.GetComponent<Animator>();
        if (inspectorAnim != null)
        {
            inspectorAnim.SetFloat("Speed", currentSpeed / normalSpeed);
        }
    }
    
    void CheckCaughtPlayer()
    {
        if (activeInspector == null || PlayerController.instance == null) return;
        
        float distance = Vector3.Distance(
            activeInspector.transform.position,
            PlayerController.instance.transform.position
        );
        
        if (distance < 2f)
        {
            CatchPlayer();
        }
    }
    
    void CatchPlayer()
    {
        // Player caught - game over
        GameManager.instance.GameOver("Caught by Inspector!");
        isChasing = false;
    }
    
    public void SpeedUpInspector(float multiplier)
    {
        normalSpeed *= multiplier;
        catchUpSpeed *= multiplier;
    }
    
    public void SlowDownInspector(float duration)
    {
        StartCoroutine(SlowDownRoutine(duration));
    }
    
    IEnumerator SlowDownRoutine(float duration)
    {
        float originalSpeed = normalSpeed;
        normalSpeed *= 0.5f;
        
        yield return new WaitForSeconds(duration);
        
        normalSpeed = originalSpeed;
    }
}
```

### 29. Mission và Objective System (Word Hunt)

```csharp
// MissionSystem.cs - Complete mission and word hunt system
public class MissionSystem : MonoBehaviour
{
    public static MissionSystem instance;
    
    [System.Serializable]
    public class Mission
    {
        public string missionId;
        public string description;
        public MissionType type;
        public int targetValue;
        public int currentProgress;
        public int rewardCoins;
        public int rewardKeys;
        public bool isCompleted;
        public bool isClaimed;
    }
    
    public enum MissionType
    {
        CollectCoins,           // Thu thập X coins
        TravelDistance,         // Chạy X mét
        ScorePoints,            // Đạt X điểm
        JumpTimes,              // Nhảy X lần
        SlideTimes,             // Trượt X lần
        CollectPowerUps,        // Thu thập X power-ups
        UseJetpack,             // Sử dụng jetpack X giây
        RideHoverboard,         // Sử dụng hoverboard X lần
        NearMisses,             // Tránh chướng ngại vật sát sao X lần
        CollectWordLetters,     // Thu thập chữ ROLL cho Word Hunt
        RollTimes,              // Lăn trên hoverboard X lần
        BumpIntoTrains,         // Va vào tàu (không chết) X lần
        CrashBarriers           // Phá hủy X barriers
    }
    
    [Header("Current Missions")]
    public List<Mission> activeMissions = new List<Mission>();
    public List<Mission> dailyMissions = new List<Mission>();
    
    [Header("Word Hunt")]
    public WordHuntData currentWordHunt;
    
    [System.Serializable]
    public class WordHuntData
    {
        public string targetWord = "ROLL";
        public bool[] lettersCollected = new bool[4]; // R, O, L, L
        public int rewardMultiplier = 5;
        public bool isComplete;
    }
    
    void Awake()
    {
        if (instance == null)
        {
            instance = this;
        }
    }
    
    void Start()
    {
        InitializeMissions();
        InitializeWordHunt();
    }
    
    void InitializeMissions()
    {
        // Generate daily missions
        dailyMissions.Add(new Mission
        {
            missionId = "daily_coins_1",
            description = "Collect 500 coins",
            type = MissionType.CollectCoins,
            targetValue = 500,
            rewardCoins = 200,
            rewardKeys = 1
        });
        
        dailyMissions.Add(new Mission
        {
            missionId = "daily_distance_1",
            description = "Run 2000 meters",
            type = MissionType.TravelDistance,
            targetValue = 2000,
            rewardCoins = 300,
            rewardKeys = 2
        });
        
        dailyMissions.Add(new Mission
        {
            missionId = "daily_jumps_1",
            description = "Jump 50 times",
            type = MissionType.JumpTimes,
            targetValue = 50,
            rewardCoins = 150,
            rewardKeys = 1
        });
    }
    
    void InitializeWordHunt()
    {
        currentWordHunt = new WordHuntData();
        currentWordHunt.lettersCollected = new bool[4];
        SpawnWordLetters();
    }
    
    void SpawnWordLetters()
    {
        // Spawn letters R, O, L, L on the track
        string[] letters = { "R", "O", "L", "L" };
        
        for (int i = 0; i < letters.Length; i++)
        {
            // Spawn letter at random position far ahead
            float spawnZ = PlayerController.instance.transform.position.z + Random.Range(100f, 500f) * (i + 1);
            int lane = Random.Range(0, 3);
            float xPos = (lane - 1) * 2.5f;
            
            Vector3 spawnPos = new Vector3(xPos, 1f, spawnZ);
            GameObject letter = Instantiate(letterPrefab, spawnPos, Quaternion.identity);
            letter.GetComponent<WordLetter>().SetLetter(letters[i], i);
        }
    }
    
    public void UpdateMissionProgress(MissionType type, int amount = 1)
    {
        foreach (var mission in activeMissions)
        {
            if (mission.type == type && !mission.isCompleted)
            {
                mission.currentProgress += amount;
                
                if (mission.currentProgress >= mission.targetValue)
                {
                    CompleteMission(mission);
                }
                
                // Update UI
                UIManager.instance.UpdateMissionUI(mission);
            }
        }
        
        foreach (var mission in dailyMissions)
        {
            if (mission.type == type && !mission.isCompleted)
            {
                mission.currentProgress += amount;
                
                if (mission.currentProgress >= mission.targetValue)
                {
                    CompleteMission(mission);
                }
            }
        }
    }
    
    void CompleteMission(Mission mission)
    {
        mission.isCompleted = true;
        
        // Show completion popup
        UIManager.instance.ShowMissionComplete(mission);
        
        // Play sound
        AudioManager.instance.PlaySFX("MissionComplete");
    }
    
    public void ClaimMissionReward(Mission mission)
    {
        if (mission.isCompleted && !mission.isClaimed)
        {
            CurrencyManager.instance.AddCoins(mission.rewardCoins);
            CurrencyManager.instance.AddKeys(mission.rewardKeys);
            mission.isClaimed = true;
            
            SaveManager.instance.SaveGame();
        }
    }
    
    public void CollectWordLetter(int letterIndex)
    {
        if (letterIndex >= 0 && letterIndex < currentWordHunt.lettersCollected.Length)
        {
            currentWordHunt.lettersCollected[letterIndex] = true;
            
            // Check if word is complete
            bool allCollected = true;
            foreach (bool collected in currentWordHunt.lettersCollected)
            {
                if (!collected)
                {
                    allCollected = false;
                    break;
                }
            }
            
            if (allCollected && !currentWordHunt.isComplete)
            {
                CompleteWordHunt();
            }
            
            // Update UI
            UIManager.instance.UpdateWordHuntUI(currentWordHunt);
        }
    }
    
    void CompleteWordHunt()
    {
        currentWordHunt.isComplete = true;
        
        // Award multiplier boost
        ScoreManager.instance.AddScoreMultiplier(currentWordHunt.rewardMultiplier);
        
        // Show completion effect
        UIManager.instance.ShowWordHuntComplete();
        AudioManager.instance.PlaySFX("WordHuntComplete");
        
        // Reset for next collection
        ResetWordHunt();
    }
    
    void ResetWordHunt()
    {
        currentWordHunt.lettersCollected = new bool[4];
        currentWordHunt.isComplete = false;
        SpawnWordLetters();
    }
}

// WordLetter.cs - Individual letter collectible
public class WordLetter : MonoBehaviour
{
    public string letter;
    public int letterIndex;
    public GameObject collectEffect;
    
    public void SetLetter(string l, int index)
    {
        letter = l;
        letterIndex = index;
        
        // Set visual text
        GetComponentInChildren<TextMesh>().text = letter;
    }
    
    void OnTriggerEnter(Collider other)
    {
        if (other.CompareTag("Player"))
        {
            CollectLetter();
        }
    }
    
    void CollectLetter()
    {
        // Update mission system
        MissionSystem.instance.CollectWordLetter(letterIndex);
        
        // Play effect
        if (collectEffect != null)
        {
            Instantiate(collectEffect, transform.position, Quaternion.identity);
        }
        
        // Play sound
        AudioManager.instance.PlaySFX("LetterCollect");
        
        // Destroy letter
        Destroy(gameObject);
    }
}
```

### 30. Leaderboard và Social Features

```csharp
// LeaderboardManager.cs - Social features and leaderboards
using UnityEngine;
using System.Collections.Generic;

public class LeaderboardManager : MonoBehaviour
{
    public static LeaderboardManager instance;
    
    [System.Serializable]
    public class LeaderboardEntry
    {
        public string playerName;
        public int score;
        public int rank;
        public string playerId;
        public bool isFriend;
    }
    
    [Header("Leaderboard Data")]
    public List<LeaderboardEntry> globalLeaderboard = new List<LeaderboardEntry>();
    public List<LeaderboardEntry> friendsLeaderboard = new List<LeaderboardEntry>();
    public List<LeaderboardEntry> weeklyLeaderboard = new List<LeaderboardEntry>();
    
    void Awake()
    {
        if (instance == null) instance = this;
    }
    
    public void SubmitScore(int score)
    {
        // Submit to global leaderboard
        LeaderboardEntry entry = new LeaderboardEntry
        {
            playerName = PlayerPrefs.GetString("PlayerName", "Player"),
            score = score,
            playerId = SystemInfo.deviceUniqueIdentifier
        };
        
        // Add to local cache
        AddToLeaderboard(globalLeaderboard, entry);
        
        // Submit to backend (implement your backend here)
        // SubmitToBackend(entry);
        
        SaveManager.instance.SaveGame();
    }
    
    void AddToLeaderboard(List<LeaderboardEntry> leaderboard, LeaderboardEntry entry)
    {
        leaderboard.Add(entry);
        
        // Sort by score descending
        leaderboard.Sort((a, b) => b.score.CompareTo(a.score));
        
        // Update ranks
        for (int i = 0; i < leaderboard.Count; i++)
        {
            leaderboard[i].rank = i + 1;
        }
        
        // Keep only top 100
        if (leaderboard.Count > 100)
        {
            leaderboard.RemoveRange(100, leaderboard.Count - 100);
        }
    }
    
    public List<LeaderboardEntry> GetLeaderboard(LeaderboardType type)
    {
        switch (type)
        {
            case LeaderboardType.Global:
                return globalLeaderboard;
            case LeaderboardType.Friends:
                return friendsLeaderboard;
            case LeaderboardType.Weekly:
                return weeklyLeaderboard;
            default:
                return globalLeaderboard;
        }
    }
    
    public int GetPlayerRank(string playerId, LeaderboardType type)
    {
        List<LeaderboardEntry> leaderboard = GetLeaderboard(type);
        
        foreach (var entry in leaderboard)
        {
            if (entry.playerId == playerId)
            {
                return entry.rank;
            }
        }
        
        return -1; // Not on leaderboard
    }
    
    public enum LeaderboardType
    {
        Global,
        Friends,
        Weekly
    }
}
```

### 31. In-App Purchase System

```csharp
// IAPManager.cs - Complete IAP implementation
using UnityEngine;
using UnityEngine.Purchasing;
using System;

public class IAPManager : MonoBehaviour, IStoreListener
{
    public static IAPManager instance;
    
    private IStoreController storeController;
    private IExtensionProvider extensionProvider;
    
    // Product IDs
    public const string PRODUCT_COINS_SMALL = "com.subwaysurfers.coins.small";
    public const string PRODUCT_COINS_MEDIUM = "com.subwaysurfers.coins.medium";
    public const string PRODUCT_COINS_LARGE = "com.subwaysurfers.coins.large";
    public const string PRODUCT_STARTER_PACK = "com.subwaysurfers.starterpack";
    public const string PRODUCT_REMOVE_ADS = "com.subwaysurfers.removeads";
    
    [System.Serializable]
    public class Product
    {
        public string productId;
        public string displayName;
        public int coinAmount;
        public int keyAmount;
        public float price;
        public ProductType type;
    }
    
    public Product[] products;
    
    void Awake()
    {
        if (instance == null)
        {
            instance = this;
            DontDestroyOnLoad(gameObject);
        }
        else
        {
            Destroy(gameObject);
        }
    }
    
    void Start()
    {
        InitializePurchasing();
    }
    
    void InitializePurchasing()
    {
        if (IsInitialized()) return;
        
        var builder = ConfigurationBuilder.Instance(StandardPurchasingModule.Instance());
        
        // Add products
        builder.AddProduct(PRODUCT_COINS_SMALL, ProductType.Consumable);
        builder.AddProduct(PRODUCT_COINS_MEDIUM, ProductType.Consumable);
        builder.AddProduct(PRODUCT_COINS_LARGE, ProductType.Consumable);
        builder.AddProduct(PRODUCT_STARTER_PACK, ProductType.Consumable);
        builder.AddProduct(PRODUCT_REMOVE_ADS, ProductType.NonConsumable);
        
        UnityPurchasing.Initialize(this, builder);
    }
    
    bool IsInitialized()
    {
        return storeController != null && extensionProvider != null;
    }
    
    public void BuyProduct(string productId)
    {
        if (!IsInitialized())
        {
            Debug.LogError("IAP not initialized");
            return;
        }
        
        Product product = storeController.products.WithID(productId);
        
        if (product != null && product.availableToPurchase)
        {
            Debug.Log($"Purchasing: {product.definition.id}");
            storeController.InitiatePurchase(product);
        }
        else
        {
            Debug.LogError("Product not available for purchase");
        }
    }
    
    public void OnInitialized(IStoreController controller, IExtensionProvider extensions)
    {
        Debug.Log("IAP Initialized successfully");
        storeController = controller;
        extensionProvider = extensions;
    }
    
    public void OnInitializeFailed(InitializationFailureReason error)
    {
        Debug.LogError($"IAP Initialization failed: {error}");
    }
    
    public PurchaseProcessingResult ProcessPurchase(PurchaseEventArgs args)
    {
        string productId = args.purchasedProduct.definition.id;
        
        Debug.Log($"Purchase successful: {productId}");
        
        // Grant rewards based on product
        switch (productId)
        {
            case PRODUCT_COINS_SMALL:
                CurrencyManager.instance.AddCoins(1200);
                break;
            case PRODUCT_COINS_MEDIUM:
                CurrencyManager.instance.AddCoins(6500);
                break;
            case PRODUCT_COINS_LARGE:
                CurrencyManager.instance.AddCoins(26000);
                break;
            case PRODUCT_STARTER_PACK:
                CurrencyManager.instance.AddCoins(5000);
                CurrencyManager.instance.AddKeys(20);
                CharacterManager.instance.UnlockCharacter("jake_special");
                break;
            case PRODUCT_REMOVE_ADS:
                PlayerPrefs.SetInt("AdsRemoved", 1);
                break;
        }
        
        SaveManager.instance.SaveGame();
        
        return PurchaseProcessingResult.Complete;
    }
    
    public void OnPurchaseFailed(Product product, PurchaseFailureReason failureReason)
    {
        Debug.LogError($"Purchase failed: {product.definition.id}, Reason: {failureReason}");
        UIManager.instance.ShowPurchaseFailedPopup();
    }
    
    public string GetProductPrice(string productId)
    {
        if (!IsInitialized()) return "$?.??";
        
        Product product = storeController.products.WithID(productId);
        if (product != null)
        {
            return product.metadata.localizedPriceString;
        }
        
        return "$?.??";
    }
}
```

### 32. Achievement System Hoàn Chỉnh

```csharp
// AchievementManager.cs - Complete achievement tracking
public class AchievementManager : MonoBehaviour
{
    public static AchievementManager instance;
    
    [System.Serializable]
    public class Achievement
    {
        public string achievementId;
        public string title;
        public string description;
        public AchievementType type;
        public int targetValue;
        public int currentProgress;
        public bool isUnlocked;
        public int rewardCoins;
        public int rewardKeys;
        public Sprite icon;
    }
    
    public enum AchievementType
    {
        TotalCoinsCollected,    // Collect X coins total (lifetime)
        TotalDistanceRun,       // Run X meters total
        HighScore,              // Reach score of X
        GamesPlayed,            // Play X games
        CharactersUnlocked,     // Unlock X characters
        PowerUpsUsed,           // Use X power-ups
        HoverboardsOwned,       // Own X hoverboards
        DailyChallengesComplete // Complete X daily challenges
    }
    
    public List<Achievement> achievements = new List<Achievement>();
    
    void Awake()
    {
        if (instance == null) instance = this;
    }
    
    void Start()
    {
        InitializeAchievements();
    }
    
    void InitializeAchievements()
    {
        // Coin collection achievements
        achievements.Add(new Achievement
        {
            achievementId = "coins_1000",
            title = "Coin Collector",
            description = "Collect 1,000 coins",
            type = AchievementType.TotalCoinsCollected,
            targetValue = 1000,
            rewardCoins = 500,
            rewardKeys = 1
        });
        
        achievements.Add(new Achievement
        {
            achievementId = "coins_10000",
            title = "Coin Master",
            description = "Collect 10,000 coins",
            type = AchievementType.TotalCoinsCollected,
            targetValue = 10000,
            rewardCoins = 2000,
            rewardKeys = 5
        });
        
        // Distance achievements
        achievements.Add(new Achievement
        {
            achievementId = "distance_5000",
            title = "Marathon Runner",
            description = "Run 5,000 meters",
            type = AchievementType.TotalDistanceRun,
            targetValue = 5000,
            rewardCoins = 1000,
            rewardKeys = 2
        });
        
        // Score achievements
        achievements.Add(new Achievement
        {
            achievementId = "score_50000",
            title = "High Scorer",
            description = "Reach a score of 50,000",
            type = AchievementType.HighScore,
            targetValue = 50000,
            rewardCoins = 1500,
            rewardKeys = 3
        });
    }
    
    public void UpdateAchievement(AchievementType type, int value)
    {
        foreach (var achievement in achievements)
        {
            if (achievement.type == type && !achievement.isUnlocked)
            {
                achievement.currentProgress = value;
                
                if (achievement.currentProgress >= achievement.targetValue)
                {
                    UnlockAchievement(achievement);
                }
            }
        }
    }
    
    void UnlockAchievement(Achievement achievement)
    {
        achievement.isUnlocked = true;
        
        // Award rewards
        CurrencyManager.instance.AddCoins(achievement.rewardCoins);
        CurrencyManager.instance.AddKeys(achievement.rewardKeys);
        
        // Show unlock notification
        UIManager.instance.ShowAchievementUnlocked(achievement);
        
        // Play sound
        AudioManager.instance.PlaySFX("AchievementUnlock");
        
        SaveManager.instance.SaveGame();
    }
    
    public List<Achievement> GetAllAchievements()
    {
        return achievements;
    }
    
    public float GetCompletionPercentage()
    {
        int unlockedCount = 0;
        foreach (var achievement in achievements)
        {
            if (achievement.isUnlocked) unlockedCount++;
        }
        
        return (float)unlockedCount / achievements.Count * 100f;
    }
}
```

## CHI TIẾT NGHỆ THUẬT VÀ THIẾT KẾ

### 33. Art Style Guide - Hướng Dẫn Phong Cách Nghệ Thuật

#### Color Palette (Bảng màu chính):
- **Primary Colors**: 
  - Electric Blue: #00D4FF
  - Vibrant Orange: #FF6B35
  - Bright Yellow: #FFD23F
  - Grass Green: #41D3BD
  
- **Secondary Colors**:
  - Sky Blue: #87CEEB
  - Sunset Red: #FF4757
  - Purple: #9B59B6
  - Pink: #FF6B9D

#### Character Design:
- **Jake (Nhân vật mặc định)**:
  - Chiều cao: 1.7m trong game
  - Polygon count: ~2,000 tris
  - Texture size: 512x512 (diffuse + normal map)
  - Animation: 15 keyframes/giây
  - Bones: 30 bones (full humanoid rig)
  
- **Style**:
  - Low-poly stylized
  - Bright, saturated colors
  - Exaggerated proportions (big head, expressive eyes)
  - Clean silhouettes

#### Environment Design:
- **Track Sections**:
  - Width: 7.5m (3 lanes @ 2.5m each)
  - Length per section: 30m
  - Train tracks: Realistic metal with rust details
  - Side walls: Graffiti-covered concrete
  
- **Buildings**:
  - Height variation: 5m - 50m
  - Style: Urban modern mixed with old subway architecture
  - Windows: Simple UV mapped textures with fake interior lighting
  - Roofs: Flat with occasional details (AC units, antennas)

#### Lighting Setup:
- **Main Directional Light**:
  - Intensity: 1.5
  - Color: Warm white (#FFFACD)
  - Angle: 45° from top-front
  - Shadows: Soft shadows, 2048 resolution
  
- **Ambient Light**:
  - Sky color: Light blue (#87CEEB)
  - Equator color: Orange tint (#FFDEAD)
  - Ground color: Dark grey (#696969)

### 34. Sound Design - Thiết Kế Âm Thanh

#### Background Music:
- **Main Theme**:
  - Tempo: 128 BPM
  - Style: Upbeat electronic/hip-hop
  - Length: 2-3 minutes (loopable)
  - Instruments: Synth bass, drums, electric guitar riffs
  
- **Menu Music**:
  - Tempo: 100 BPM
  - Style: Chill electronic
  - More ambient than main theme

#### Sound Effects List:

**Player Actions**:
- Jump: Whoosh sound (0.2s)
- Land: Thud (0.1s)
- Slide: Scraping sound (1s, loopable)
- Footsteps: Running sounds (0.15s per step)
- Crash: Glass breaking + metal crunch (0.5s)

**Collectibles**:
- Coin: Bright "ding" (0.1s)
- Power-up: Magical chime (0.3s)
- Letter: Piano note (0.2s)

**Power-Ups**:
- Jetpack: Rocket thrust (looping)
- Magnet: Electric hum (looping)
- Multiplier: Ascending chime (0.5s)
- Super Sneakers: Bounce sound (0.2s)

**UI Sounds**:
- Button click: Soft pop (0.05s)
- Menu open: Swish (0.2s)
- Purchase: Cash register (0.3s)
- Achievement unlock: Fanfare (1s)

## BUILD VÀ OPTIMIZATION

### 35. Platform-Specific Optimization

```csharp
// PlatformOptimizer.cs - Platform-specific settings
public class PlatformOptimizer : MonoBehaviour
{
    void Awake()
    {
        OptimizeForPlatform();
    }
    
    void OptimizeForPlatform()
    {
        #if UNITY_ANDROID
        OptimizeAndroid();
        #elif UNITY_IOS
        OptimizeIOS();
        #elif UNITY_STANDALONE
        OptimizePC();
        #endif
    }
    
    void OptimizeAndroid()
    {
        // Set target frame rate
        Application.targetFrameRate = 60;
        
        // Adjust quality based on device
        if (SystemInfo.systemMemorySize < 3000)
        {
            // Low-end device
            QualitySettings.SetQualityLevel(0);
            QualitySettings.shadowDistance = 20f;
            QualitySettings.shadows = ShadowQuality.Disable;
        }
        else if (SystemInfo.systemMemorySize < 6000)
        {
            // Mid-range device
            QualitySettings.SetQualityLevel(1);
            QualitySettings.shadowDistance = 40f;
            QualitySettings.shadows = ShadowQuality.HardOnly;
        }
        else
        {
            // High-end device
            QualitySettings.SetQualityLevel(2);
            QualitySettings.shadowDistance = 60f;
            QualitySettings.shadows = ShadowQuality.All;
        }
        
        // Texture compression
        SetTextureCompression("ASTC");
    }
    
    void OptimizeIOS()
    {
        Application.targetFrameRate = 60;
        
        // iOS generally has better performance
        QualitySettings.SetQualityLevel(2);
        
        // Metal API optimizations
        SetTextureCompression("PVRTC");
    }
    
    void OptimizePC()
    {
        // Unlock frame rate for PC
        Application.targetFrameRate = -1;
        QualitySettings.vSyncCount = 1;
        
        // Max quality
        QualitySettings.SetQualityLevel(3);
        QualitySettings.shadowDistance = 100f;
        QualitySettings.shadows = ShadowQuality.All;
    }
    
    void SetTextureCompression(string format)
    {
        // Set appropriate texture compression
        // This would be done in build settings, not runtime
        Debug.Log($"Using {format} texture compression");
    }
}
```

## KẾT LUẬN VÀ ROADMAP

### Roadmap Phát Triển (6-12 tháng):

**Tháng 1-2: Core Gameplay**
- ✓ Player movement (3 lanes, jump, slide)
- ✓ Camera system
- ✓ Basic collision detection
- ✓ Infinite track generation
- ✓ Coin collection

**Tháng 3-4: Game Features**
- ✓ Power-up system (Jetpack, Magnet, Multiplier, Sneakers)
- ✓ Hoverboard mechanic
- ✓ Inspector chase system
- ✓ Score and currency system
- ✓ Obstacle variety (trains, barriers, tunnels)

**Tháng 5-6: Content & Polish**
- ✓ Multiple characters (10-15)
- ✓ Multiple hoverboards (10-15)
- ✓ Daily missions
- ✓ Word Hunt feature
- ✓ Achievement system
- ✓ Visual effects and particle systems
- ✓ Sound design and music

**Tháng 7-8: UI/UX & Monetization**
- ✓ Complete UI (menus, shop, settings)
- ✓ In-app purchases
- ✓ Ad integration (rewarded, interstitial)
- ✓ Tutorial system
- ✓ Leaderboards

**Tháng 9-10: Testing & Optimization**
- ✓ Performance optimization
- ✓ Bug fixing
- ✓ Balancing (difficulty curve, economy)
- ✓ Beta testing
- ✓ Analytics integration

**Tháng 11-12: Launch & Live Ops**
- ✓ Soft launch (limited regions)
- ✓ Marketing materials
- ✓ Global launch
- ✓ Live events
- ✓ Seasonal content updates

### Team Cần Thiết:
1. **Game Programmer** (2 người) - Core gameplay, systems
2. **UI/UX Designer** (1 người) - Interface, user experience
3. **3D Artist** (1-2 người) - Characters, environments, props
4. **Animator** (1 người) - Character animations
5. **Sound Designer** (1 người) - Music, sound effects
6. **Game Designer** (1 người) - Balance, progression, monetization
7. **QA Tester** (1-2 người) - Testing, bug reporting

### Tools & Software:
- **Unity 2020.3 LTS** hoặc mới hơn
- **Visual Studio 2019/2022**
- **Blender** hoặc **Maya** (3D modeling)
- **Adobe Photoshop** hoặc **GIMP** (textures)
- **Audacity** (audio editing)
- **Git** (version control)
- **Firebase** (analytics, cloud save)
- **Unity Ads** hoặc **AdMob** (monetization)

Với hướng dẫn chi tiết này, bạn có đủ thông tin để tạo ra một game endless runner giống Subway Surfers. Hãy bắt đầu từ prototype đơn giản và từ từ thêm features!

Chúc bạn thành công! 🎮🚇
